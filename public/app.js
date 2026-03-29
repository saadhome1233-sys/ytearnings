document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    
    // Check for saved theme preference or use system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // Toggle theme
    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.theme = 'dark';
            themeToggleIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            localStorage.theme = 'light';
            themeToggleIcon.classList.replace('fa-sun', 'fa-moon');
        }
        // Update chart colors if chart exists
        if(window.earningsChartInstance) updateChartTheme(window.earningsChartInstance);
        if(window.compareChartInstance) updateChartTheme(window.compareChartInstance);
    });

    // Tabs logic
    const tabAnalyze = document.getElementById('tab-analyze');
    const tabCompare = document.getElementById('tab-compare');
    const analyzeView = document.getElementById('analyze-view');
    const compareView = document.getElementById('compare-view');

    tabAnalyze.addEventListener('click', () => {
        tabAnalyze.classList.replace('text-gray-600', 'text-white');
        tabAnalyze.classList.replace('dark:text-gray-300', 'text-white');
        tabAnalyze.classList.add('bg-red-600', 'shadow-md');
        tabAnalyze.classList.remove('hover:bg-gray-100', 'dark:hover:bg-gray-700');
        
        tabCompare.classList.remove('bg-red-600', 'text-white', 'shadow-md');
        tabCompare.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        
        analyzeView.classList.remove('hidden');
        compareView.classList.add('hidden');
    });

    tabCompare.addEventListener('click', () => {
        tabCompare.classList.replace('text-gray-600', 'text-white');
        tabCompare.classList.replace('dark:text-gray-300', 'text-white');
        tabCompare.classList.add('bg-red-600', 'shadow-md');
        tabCompare.classList.remove('hover:bg-gray-100', 'dark:hover:bg-gray-700');
        
        tabAnalyze.classList.remove('bg-red-600', 'text-white', 'shadow-md');
        tabAnalyze.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
        
        compareView.classList.remove('hidden');
        analyzeView.classList.add('hidden');
    });

    const form = document.getElementById('analyze-form');
    const urlInput = document.getElementById('url-input');
    const submitBtn = document.getElementById('submit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const resultsContainer = document.getElementById('results-container');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = urlInput.value.trim();
        if (!url) return;

        // UI Reset
        errorMessage.classList.add('hidden');
        resultsContainer.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong. Please try again.');
            }

            renderResults(data);

        } catch (error) {
            errorText.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            loadingSpinner.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });

    function formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    }

    function renderResults(data) {
        // Elements
        document.getElementById('result-thumbnail').src = data.thumbnail;
        document.getElementById('result-title').textContent = data.title;
        
        const badge = document.getElementById('result-badge');
        const statsRow = document.getElementById('result-stats-row');
        const earningsContainer = document.getElementById('earnings-cards-container');
        const metricsList = document.getElementById('metrics-list');
        
        statsRow.innerHTML = '';
        earningsContainer.innerHTML = '';
        metricsList.innerHTML = '';

        let chartLabels = [];
        let chartData = [];
        let chartTitle = '';

        if (data.type === 'channel') {
            badge.innerHTML = '<i class="fa-solid fa-tv mr-1"></i> Channel Analysis';
            
            statsRow.innerHTML = `
                <div class="flex items-center gap-1"><i class="fa-solid fa-users text-blue-500"></i> ${formatNumber(data.subscribers)} Subs</div>
                <div class="flex items-center gap-1"><i class="fa-solid fa-eye text-green-500"></i> ${formatNumber(data.totalViews)} Views</div>
                <div class="flex items-center gap-1"><i class="fa-solid fa-video text-red-500"></i> ${formatNumber(data.videoCount)} Videos</div>
            `;

            earningsContainer.innerHTML = `
                ${createEarningCard('Low CPM ($0.50)', data.earnings.totalLow, 'text-yellow-600 dark:text-yellow-400')}
                ${createEarningCard('Avg CPM ($2.00)', data.earnings.totalAvg, 'text-green-600 dark:text-green-400', true)}
                ${createEarningCard('High CPM ($5.00)', data.earnings.totalHigh, 'text-blue-600 dark:text-blue-400')}
            `;

            metricsList.innerHTML = `
                <li class="flex justify-between border-b dark:border-gray-700 pb-2">
                    <span class="text-gray-500">Est. Daily Earnings</span>
                    <span class="font-bold text-green-500">${formatMoney(data.earnings.dailyAvg)}</span>
                </li>
                <li class="flex justify-between border-b dark:border-gray-700 pb-2">
                    <span class="text-gray-500">Est. Monthly Earnings</span>
                    <span class="font-bold text-green-500">${formatMoney(data.earnings.monthlyAvg)}</span>
                </li>
                <li class="flex justify-between pb-2">
                    <span class="text-gray-500">Avg Views / Video</span>
                    <span class="font-bold">${formatNumber(Math.floor(data.totalViews / data.videoCount))}</span>
                </li>
            `;

            chartLabels = ['Low Estimate', 'Average Estimate', 'High Estimate'];
            chartData = [data.earnings.totalLow, data.earnings.totalAvg, data.earnings.totalHigh];
            chartTitle = 'Total Channel Earnings Variation';

        } else if (data.type === 'video') {
            const vidType = data.isShorts ? 'YouTube Shorts' : 'Long Video';
            badge.innerHTML = `<i class="fa-solid fa-play mr-1"></i> ${vidType} Analysis`;
            
            statsRow.innerHTML = `
                <div class="flex items-center gap-1"><i class="fa-solid fa-eye text-green-500"></i> ${formatNumber(data.views)} Views</div>
                <div class="flex items-center gap-1"><i class="fa-solid fa-thumbs-up text-blue-500"></i> ${formatNumber(data.likes)} Likes</div>
                <div class="flex items-center gap-1"><i class="fa-solid fa-comment text-yellow-500"></i> ${formatNumber(data.comments)} Comments</div>
            `;

            earningsContainer.innerHTML = `
                ${createEarningCard('Low Estimate', data.earnings.low, 'text-yellow-600 dark:text-yellow-400')}
                ${createEarningCard('Mid Estimate', (data.earnings.low + data.earnings.high)/2, 'text-green-600 dark:text-green-400', true)}
                ${createEarningCard('High Estimate', data.earnings.high, 'text-blue-600 dark:text-blue-400')}
            `;

            metricsList.innerHTML = `
                <li class="flex justify-between border-b dark:border-gray-700 pb-2">
                    <span class="text-gray-500">Author</span>
                    <span class="font-bold">${data.channelTitle}</span>
                </li>
                <li class="flex justify-between border-b dark:border-gray-700 pb-2">
                    <span class="text-gray-500">Format</span>
                    <span class="font-bold">${vidType}</span>
                </li>
                <li class="flex justify-between pb-2">
                    <span class="text-gray-500">Engagement Rate</span>
                    <span class="font-bold text-purple-500">${data.engagementRate}%</span>
                </li>
            `;

            chartLabels = ['Low CPM', 'Avg CPM', 'High CPM'];
            chartData = [data.earnings.low, (data.earnings.low + data.earnings.high)/2, data.earnings.high];
            chartTitle = 'Video Earnings Range';
        }

        renderChart(chartLabels, chartData, chartTitle);
        resultsContainer.classList.remove('hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function createEarningCard(title, amount, colorClass, isHighlighted = false) {
        const borderClass = isHighlighted ? 'border-2 border-green-500 shadow-md transform scale-105' : 'border border-gray-200 dark:border-gray-700';
        const bgClass = isHighlighted ? 'bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800' : 'bg-white dark:bg-gray-800';
        
        return `
            <div class="${bgClass} rounded-2xl p-6 ${borderClass} flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1 duration-300">
                <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">${title}</h4>
                <div class="text-3xl font-extrabold ${colorClass}">${formatMoney(amount)}</div>
            </div>
        `;
    }

    // Chart logic
    window.earningsChartInstance = null;

    function renderChart(labels, dataArr, title) {
        const ctx = document.getElementById('earningsChart').getContext('2d');
        
        if (window.earningsChartInstance) {
            window.earningsChartInstance.destroy();
        }

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        window.earningsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'USD ($)',
                    data: dataArr,
                    backgroundColor: [
                        'rgba(234, 179, 8, 0.7)',
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(59, 130, 246, 0.7)'
                    ],
                    borderColor: [
                        'rgb(234, 179, 8)',
                        'rgb(34, 197, 94)',
                        'rgb(59, 130, 246)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: title,
                        color: textColor,
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: function(value) { return '$' + value; }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    function updateChartTheme(chartInstance) {
        if(!chartInstance) return;
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? '#374151' : '#e5e7eb';
        
        chartInstance.options.plugins.title.color = textColor;
        chartInstance.options.scales.x.ticks.color = textColor;
        chartInstance.options.scales.y.ticks.color = textColor;
        chartInstance.options.scales.y.grid.color = gridColor;
        chartInstance.update();
    }

    // Compare Logic
    const compareForm = document.getElementById('compare-form');
    const compareUrlInput1 = document.getElementById('url-input-1');
    const compareUrlInput2 = document.getElementById('url-input-2');
    const compareBtn = document.getElementById('compare-btn');
    const compareSpinner = document.getElementById('compare-loading-spinner');
    const compareError = document.getElementById('compare-error-message');
    const compareErrorText = document.getElementById('compare-error-text');
    const compareResults = document.getElementById('compare-results-container');
    const compareChartContainer = document.getElementById('compare-chart-container');
    const compareBox1 = document.getElementById('compare-box-1');
    const compareBox2 = document.getElementById('compare-box-2');

    if (compareForm) {
        compareForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const url1 = compareUrlInput1.value.trim();
            const url2 = compareUrlInput2.value.trim();
            if (!url1 || !url2) return;

            // UI Reset
            compareError.classList.add('hidden');
            compareResults.classList.add('hidden');
            compareChartContainer.classList.add('hidden');
            compareSpinner.classList.remove('hidden');
            compareBtn.disabled = true;
            compareBtn.classList.add('opacity-50', 'cursor-not-allowed');

            try {
                const [res1, res2] = await Promise.all([
                    fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: url1 })
                    }),
                    fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: url2 })
                    })
                ]);

                const data1 = await res1.json();
                const data2 = await res2.json();

                if (!res1.ok) throw new Error(`URL 1 Error: ${data1.error || 'Failed'}`);
                if (!res2.ok) throw new Error(`URL 2 Error: ${data2.error || 'Failed'}`);

                renderCompareResults(data1, data2);

            } catch (error) {
                compareErrorText.textContent = error.message;
                compareError.classList.remove('hidden');
            } finally {
                compareSpinner.classList.add('hidden');
                compareBtn.disabled = false;
                compareBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    function generateCompareHTML(data) {
        let statsHTML = '';
        let avgEarn = 0;
        let typeBadge = '';
        
        if (data.type === 'channel') {
            typeBadge = '<i class="fa-solid fa-tv mr-1"></i> Channel';
            avgEarn = data.earnings.totalAvg;
            statsHTML = `
                <div class="flex justify-between border-b dark:border-gray-700 py-1"><span class="text-gray-500">Subscribers</span><span class="font-bold">${formatNumber(data.subscribers)}</span></div>
                <div class="flex justify-between border-b dark:border-gray-700 py-1"><span class="text-gray-500">Total Views</span><span class="font-bold">${formatNumber(data.totalViews)}</span></div>
                <div class="flex justify-between py-1"><span class="text-gray-500">Videos</span><span class="font-bold">${formatNumber(data.videoCount)}</span></div>
            `;
        } else {
            typeBadge = '<i class="fa-solid fa-play mr-1"></i> Video';
            avgEarn = (data.earnings.low + data.earnings.high)/2;
            statsHTML = `
                <div class="flex justify-between border-b dark:border-gray-700 py-1"><span class="text-gray-500">Views</span><span class="font-bold">${formatNumber(data.views)}</span></div>
                <div class="flex justify-between border-b dark:border-gray-700 py-1"><span class="text-gray-500">Likes</span><span class="font-bold">${formatNumber(data.likes)}</span></div>
                <div class="flex justify-between py-1"><span class="text-gray-500">Engagement</span><span class="font-bold">${data.engagementRate}%</span></div>
            `;
        }

        return {
            avgEarn,
            html: `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 p-6 flex flex-col h-full">
                <div class="flex items-center gap-4 mb-4">
                    <img src="${data.thumbnail}" alt="Thumbnail" class="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-700">
                    <div>
                        <span class="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-full mb-1 inline-block">${typeBadge}</span>
                        <h3 class="font-bold line-clamp-2" title="${data.title}">${data.title}</h3>
                    </div>
                </div>
                <div class="space-y-2 flex-grow">
                    ${statsHTML}
                </div>
                <div class="mt-6 pt-4 border-t dark:border-gray-700 text-center">
                    <span class="text-sm text-gray-500 uppercase tracking-wide block mb-1">Avg Estimated Earnings</span>
                    <span class="text-2xl font-extrabold text-green-500">${formatMoney(avgEarn)}</span>
                </div>
            </div>`
        };
    }

    function renderCompareResults(d1, d2) {
        const p1 = generateCompareHTML(d1);
        const p2 = generateCompareHTML(d2);
        
        compareBox1.innerHTML = p1.html;
        compareBox2.innerHTML = p2.html;
        
        compareResults.classList.remove('hidden');
        renderCompareChart([d1.title.length > 20 ? d1.title.substring(0,20)+'...' : d1.title, 
                            d2.title.length > 20 ? d2.title.substring(0,20)+'...' : d2.title], 
                           [p1.avgEarn, p2.avgEarn]);
        compareChartContainer.classList.remove('hidden');
    }

    window.compareChartInstance = null;
    function renderCompareChart(labels, dataArr) {
        const ctx = document.getElementById('compareChart').getContext('2d');
        if (window.compareChartInstance) window.compareChartInstance.destroy();

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#9ca3af' : '#4b5563';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        window.compareChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Avg Estimated Earnings (USD)',
                    data: dataArr,
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(236, 72, 153, 0.7)'
                    ],
                    borderColor: [
                        'rgb(239, 68, 68)',
                        'rgb(236, 72, 153)'
                    ],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Earnings Comparison',
                        color: textColor,
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, callback: function(v) { return '$' + v; } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }
});
