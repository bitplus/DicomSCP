class PrintManager {
    constructor() {
        this.initAxiosInterceptors();
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.totalItems = 0;
        this.currentJobs = [];
        this.printers = [];
        this.isLoading = false;

       // 初始化事件和加载数据
        this.init();
    }

    async init() {
        try {
            // 初始化事件绑定
            this.initializeEvents();
            
            // 加载打印机列表
            await this.loadPrinters();
            // 加载任务列表
            await this.loadPrintJobs();
        } catch (error) {
            console.error('初始化打印管理器失败:', error);
            window.showToast(error.message, 'error');
        }
    }

    initAxiosInterceptors() {
        axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    window.location.href = '/login.html';
                    return new Promise(() => {});
                }
                return Promise.reject(error);
            }
        );
    }

    initializeEvents() {
        // 添加日志
        console.log('Initializing print events');
        
        // 绑定打印按钮点击事件
        document.querySelectorAll('.print-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const jobId = button.getAttribute('data-job-id');
                if (jobId) {
                    await this.showPrinterSelect(jobId);
                }
            });
        });

        // 绑定刷新按钮事件
        const refreshBtn = document.getElementById('print-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadPrintJobs());
        }

        // 绑定分页按钮事件
        const prevBtn = document.getElementById('print-prevPage');
        const nextBtn = document.getElementById('print-nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevPage());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // 添加搜索表单事件绑定
        const searchForm = document.getElementById('printSearchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.loadPrintJobs();
            });
        }
    }

    async loadPrintJobs() {
        if (this.isLoading) {
            console.log('正在加载中，跳过重复请求');
            return;
        }

        const tbody = document.getElementById('print-jobs-table-body');
        if (!tbody) {
            console.error('找不到打印任务列表元素');
            return;
        }

        showTableLoading(tbody, 6);  // 打印列表有6列

        try {
            this.isLoading = true;

            // 获取搜索参数
            const searchParams = {
                callingAE: document.getElementById('searchCallingAE')?.value || '',
                studyUID: document.getElementById('searchStudyUID')?.value || '',
                status: document.getElementById('searchPrintStatus')?.value || '',
                date: document.getElementById('searchDate')?.value || '',
                page: this.currentPage,
                pageSize: this.pageSize
            };

            // 构建查询参数
            const queryParams = new URLSearchParams();
            if (searchParams.callingAE) queryParams.append('callingAE', searchParams.callingAE);
            if (searchParams.studyUID) queryParams.append('studyUID', searchParams.studyUID);
            if (searchParams.status) queryParams.append('status', searchParams.status);
            if (searchParams.date) queryParams.append('date', searchParams.date);
            queryParams.append('page', searchParams.page);
            queryParams.append('pageSize', searchParams.pageSize);

            const response = await axios.get(`/api/print?${queryParams}`);
            const data = response.data;

            if (!data.items || data.items.length === 0) {
                showEmptyTable(tbody, '暂无打印任务', 6);
                return;
            }

            // 更新数据和UI
            this.currentJobs = data.items;
            this.totalItems = data.total;
            this.totalPages = data.totalPages;
            this.updatePrintJobsTable(data.items);
            this.updatePagination();

        } catch (error) {
            console.error('加载打印任务失败:', error);
            showEmptyTable(tbody, '加载失败，请重试', 6);
        } finally {
            this.isLoading = false;
        }
    }

    updatePagination() {
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalItems);

        document.getElementById('print-currentRange').textContent = 
            this.totalItems > 0 ? `${start}-${end}` : '0-0';
        document.getElementById('print-totalCount').textContent = this.totalItems;
        document.getElementById('print-currentPage').textContent = this.currentPage;

        document.getElementById('print-prevPage').disabled = this.currentPage === 1;
        document.getElementById('print-nextPage').disabled = 
            this.currentPage === this.totalPages || this.totalItems === 0;
    }

    async prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            await this.loadPrintJobs();
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            await this.loadPrintJobs();
        }
    }

    async searchPrintJobs() {
        this.currentPage = 1;
        await this.loadPrintJobs();
    }

    resetSearch() {
        const form = document.getElementById('printSearchForm');
        if (form) {
            form.reset();
            this.currentPage = 1;
            this.loadPrintJobs();
        }
    }

    updatePrintJobsTable(jobs) {
        const tbody = document.getElementById('print-jobs-table-body');
        if (!tbody) return;

        // 使用 DocumentFragment 提高性能
        const fragment = document.createDocumentFragment();
        jobs.forEach(job => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${job.jobId || ''}</td>
                <td>${job.callingAE || ''}</td>
                <td>${job.studyInstanceUID || ''}</td>
                <td>${this.formatDateTime(job.createTime)}</td>
                <td>${this.formatStatus(job.status)}</td>
                <td>${this.getActionButtons(job)}</td>
            `;
            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);

        // 更新状态统计
        this.updateJobStats(jobs);
    }

    // 状态常量
    static PrintJobStatus = {
        0: 'Created',
        1: 'ImageReceived',
        2: 'Completed',
        3: 'Failed'
    };

    // 状态文本映射
    static StatusText = {
        'Created': '已创建',
        'ImageReceived': '已接收',
        'Completed': '已完成',
        'Failed': '失败'
    };

    formatStatus(status) {
        if (status === null || status === undefined) {
            return '<span class="badge bg-secondary">未知</span>';
        }

        // 先将数字状态转换为字符串状态
        const statusStr = PrintManager.PrintJobStatus[status] || status;
        // 再获取对应的中文文本
        const text = PrintManager.StatusText[statusStr] || statusStr;
        const badgeClass = this.getStatusBadgeClass(statusStr);
        return `<span class="badge ${badgeClass}">${text}</span>`;
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'Created':
                return 'bg-secondary text-white';
            case 'ImageReceived':
                return 'bg-info text-white';
            case 'Completed':
                return 'bg-success text-white';
            case 'Failed':
                return 'bg-danger text-white';
            default:
                return 'bg-secondary text-white';
        }
    }

    getActionButtons(job) {
        const buttons = [];
        
        // 添加打印按钮
        buttons.push(`
            <button class="btn btn-sm btn-success me-1" 
                onclick="printManager.showPrinterSelect('${job.jobId}')">
                <i class="bi bi-printer"></i> 打印
            </button>
        `);

        // 添加预览按钮
        buttons.push(`
            <button class="btn btn-sm btn-primary me-1" 
                onclick="printManager.previewImage('${job.jobId}')">
                <i class="bi bi-eye"></i> 预览
            </button>
        `);

        // 添加详情按钮
        buttons.push(`
            <button class="btn btn-sm btn-info me-1" 
                onclick="printManager.showDetails('${job.jobId}')">
                <i class="bi bi-info-circle"></i> 详情
            </button>
        `);
        
        // 添加删除按钮
        buttons.push(`
            <button class="btn btn-sm btn-danger" 
                onclick="printManager.deletePrintJob('${job.jobId}')">
                <i class="bi bi-trash"></i> 删除
            </button>
        `);
        
        return buttons.join('');
    }

    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        const date = new Date(dateTimeStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    updateJobStats(jobs) {
        const stats = jobs.reduce((acc, job) => {
            // 先将数字状态转换为字符串状态
            const statusStr = PrintManager.PrintJobStatus[job.status] || job.status;
            acc[statusStr] = (acc[statusStr] || 0) + 1;
            return acc;
        }, {});

        const statsContainer = document.getElementById('print-jobs-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <span class="badge bg-secondary me-2">总数: ${jobs.length}</span>
                ${stats['Created'] ? 
                    `<span class="badge bg-secondary me-2">已创建: ${stats['Created']}</span>` : ''}
                ${stats['ImageReceived'] ? 
                    `<span class="badge bg-info me-2">已接收: ${stats['ImageReceived']}</span>` : ''}
                ${stats['Completed'] ? 
                    `<span class="badge bg-success me-2">已完成: ${stats['Completed']}</span>` : ''}
                ${stats['Failed'] ? 
                    `<span class="badge bg-danger me-2">失败: ${stats['Failed']}</span>` : ''}
            `;
        }
    }

    showToast(message) {
        if (message instanceof Error) {
            window.showToast(message.message, 'error');
        } else {
            window.showToast(message, 'success');
        }
    }

    // 预览图像
    async previewImage(jobId) {
        try {
            return showDialog({
                title: '预览',
                content: `
                    <div class="text-center position-relative" style="height: calc(90vh - 120px);">
                        <div id="imageLoading" class="spinner-border text-primary position-absolute top-50 start-50" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <img id="previewImage" 
                            style="max-width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.3s;" 
                            alt="预览图像"
                        />
                    </div>
                `,
                onShow: () => {
                    const img = document.getElementById('previewImage');
                    const loading = document.getElementById('imageLoading');

                    // 重置图像
                    img.style.opacity = '0';
                    loading.style.display = 'block';

                    // 设置图像源
                    img.src = `/api/print/${jobId}/image?width=1200`;  // 增加图像宽度

                    // 图像加载完成后隐藏加载提示
                    img.onload = () => {
                        loading.style.display = 'none';
                        img.style.opacity = '1';
                    };

                    // 图像加载失败处理
                    img.onerror = () => {
                        loading.style.display = 'none';
                        window.showToast('图像加载失败', 'error');
                    };
                },
                showFooter: false,  // 不显示底部按钮
                size: 'xl',  // 使用超大对话框
                fullHeight: true  // 使用全高度
            });
        } catch (error) {
            console.error('预览图像失败:', error);
            window.showToast('预览图像失败', 'error');
        }
    }

    // 显示任务详情
    async showDetails(jobId) {
        try {
            const response = await fetch(`/api/print/${jobId}`);
            if (!response.ok) {
                throw new Error('获取任务详情失败');
            }
            const data = await response.json();

            return showDialog({
                title: '任务详情',
                content: `
                    <div class="table-responsive" style="max-height: calc(90vh - 120px); overflow-y: auto;">
                        <table class="table table-sm table-hover">
                            <tbody>
                                ${this.generateDetailRows(data)}
                            </tbody>
                        </table>
                    </div>
                `,
                showFooter: false,  // 不显示底部按钮
                size: 'lg',  // 使用大对话框
                fullHeight: true  // 使用全高度
            });
        } catch (error) {
            console.error('获取任务详情失败:', error);
            window.showToast('获取任务详情失败', 'error');
        }
    }

    // 删除打印任务
    async deletePrintJob(jobId) {
        if (!await showConfirmDialog('确认删除', '确定要删除个打印任务吗？')) {
            return;
        }

        try {
            const response = await fetch(`/api/print/${jobId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('删除失败');
            }

            this.showToast('打印任务已删除');
            await this.loadPrintJobs();
        } catch (error) {
            this.showToast('删除失败');
        }
    }

    // 格式化字段值
    formatFieldValue(key, value) {
        if (value === null || value === undefined) return '';
        
        switch (key) {
            case 'status':
                return this.formatStatus(value);
            case 'printInColor':
                return value ? '是' : '否';
            case 'createTime':
            case 'updateTime':
                return this.formatDateTime(value);
            default:
                return value.toString();
        }
    }

    // 更新打印机下拉列表
    updatePrinterSelect() {
        const select = document.getElementById('printerSelect');
        if (!select) {
            console.error('找不到打印机选择框');
            return;
        }

        if (!this.printers || this.printers.length === 0) {
            select.innerHTML = '<option value="">暂无可用打印机</option>';
            return;
        }

        select.innerHTML = this.printers.map(printer => `
            <option value="${printer.name}" ${printer.isDefault ? 'selected' : ''}>
                ${printer.name} - ${printer.description || printer.aeTitle}
            </option>
        `).join('');

        // 如果没有选中的打印机，则选择第一个
        if (!select.value && this.printers.length > 0) {
            select.value = this.printers[0].name;
        }
    }

    // 显示打印机选择对话框
    async showPrinterSelect(jobId) {
        try {
            // 确保打印机列表已加载
            if (this.printers.length === 0) {
                await this.loadPrinters();
            }

            return showDialog({
                title: '选择打印机',
                content: `
                    <div class="mb-3">
                        <label class="form-label">可用打印机</label>
                        <select class="form-select" id="printerSelect">
                            <!-- 打印机列表将动态填充 -->
                        </select>
                    </div>
                `,
                onShow: () => {
                    this.updatePrinterSelect();  // 更新打印机列表
                },
                onConfirm: async () => {
                    const select = document.getElementById('printerSelect');
                    const printerName = select.value;
                    if (!printerName) {
                        window.showToast('请选择打印机', 'error');
                        return false;
                    }
                    return await this.confirmPrint(jobId, printerName);
                }
            });
        } catch (error) {
            console.error('显示打印机选择对话框失败:', error);
            window.showToast('显示打印机选择对话框失败', 'error');
        }
    }

    // 确认打印
    async confirmPrint(jobId, printerName) {
        try {
            const response = await fetch('/api/PrintScu/print-by-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobId: jobId,
                    printerName: printerName
                })
            });

            if (!response.ok) {
                throw new Error('打印失败');
            }

            await response.json();
            window.showToast('打印任务已发送', 'success');
            this.loadPrintJobs(); // 刷新任务列表
            return true;  // 返回 true 让对话框关闭
        } catch (error) {
            console.error('打印失败:', error);
            window.showToast(error.message || '打印失败', 'error');
            return false;  // 返回 false 让对话框保持打开
        }
    }

    // 加载打印机列表
    async loadPrinters() {
        try {
            const response = await fetch('/api/PrintScu/printers');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取打印机列表失败');
            }
            this.printers = await response.json();
        } catch (error) {
            console.error('加载打印机列表失败:', error);
            window.showToast('加载打印机列表失败', 'error');
            throw error;
        }
    }

    renderPrintJobs(jobs) {
        const tbody = document.getElementById('print-table-body');
        if (!tbody) return;

        tbody.innerHTML = jobs.map(job => `
            <tr>
                <td>${job.jobId}</td>
                <td>${job.patientName} (${job.patientId})</td>
                <td>${job.accessionNumber}</td>
                <td>${this.formatStatus(job.status)}</td>
                <td>${this.formatDateTime(job.createTime)}</td>
                <td>
                    <button class="btn btn-primary btn-sm print-button" data-job-id="${job.jobId}">
                        <i class="bi bi-printer"></i> 打印
                    </button>
                    <button class="btn btn-info btn-sm" onclick="printManager.previewImage('${job.jobId}')">
                        <i class="bi bi-eye"></i> 预览
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="printManager.deletePrintJob('${job.jobId}')">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `).join('');

        // 重新绑定打印按钮事件
        this.initializeEvents();
    }

    // 生成详情行
    generateDetailRows(job) {
        const sections = [
            {
                title: '基本信息',
                fields: [
                    { key: 'jobId', name: '任务ID' },
                    { key: 'callingAE', name: '请求方AE' },
                    { key: 'status', name: '状态' },
                    { key: 'errorMessage', name: '错误信息' }
                ]
            },
            {
                title: 'Film Session 参数',
                fields: [
                    { key: 'numberOfCopies', name: '打印份数' },
                    { key: 'printPriority', name: '打印优先级' },
                    { key: 'mediumType', name: '介质类型' },
                    { key: 'filmDestination', name: '胶片目标' }
                ]
            },
            {
                title: 'Film Box 参数',
                fields: [
                    { key: 'printInColor', name: '彩色打印' },
                    { key: 'filmOrientation', name: '胶片方向' },
                    { key: 'filmSizeID', name: '胶片尺寸' },
                    { key: 'imageDisplayFormat', name: '图像显示格式' },
                    { key: 'magnificationType', name: '放大类型' },
                    { key: 'borderDensity', name: '边框密度' },
                    { key: 'emptyImageDensity', name: '空图像密度' },
                    { key: 'minDensity', name: '最小密度' },
                    { key: 'maxDensity', name: '最大密度' }
                ]
            },
            {
                title: '其他信息',
                fields: [
                    { key: 'studyInstanceUID', name: '检查实例UID' },
                    { key: 'imagePath', name: '图像路径' },
                    { key: 'createTime', name: '创建时间' },
                    { key: 'updateTime', name: '更新时间' }
                ]
            }
        ];

        return sections.map(section => `
            <tr>
                <th colspan="2" class="bg-light">${section.title}</th>
            </tr>
            ${section.fields.map(field => job[field.key] !== undefined ? `
                <tr>
                    <th class="text-nowrap" style="width: 150px">${field.name}</th>
                    <td>${this.formatFieldValue(field.key, job[field.key])}</td>
                </tr>
            ` : '').join('')}
        `).join('');
    }
}

// 初始化打印管理器
let printManager;
document.addEventListener('DOMContentLoaded', () => {
    printManager = new PrintManager();
}); 