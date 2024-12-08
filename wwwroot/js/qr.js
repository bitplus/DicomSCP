// QR客户端相关变量
let qrCurrentPage = 1;
const qrPageSize = 10;
let qrAllData = [];
let qrSeriesModal;
let selectedQRNode = null;

// 初始化QR模块
function initializeQR() {
    try {
        loadQRNodes();
        bindQRPaginationEvents();
        initQRSeriesModal();
    } catch (error) {
        console.error('初始化QR模块失败:', error);
        window.showToast('初始化失败', 'error');
    }
}

// 初始化序列模态框
function initQRSeriesModal() {
    const modalElement = document.getElementById('seriesModal');
    if (modalElement) {
        qrSeriesModal = new bootstrap.Modal(modalElement);
    }
}

// 绑定QR分页事件
function bindQRPaginationEvents() {
    try {
        const prevBtn = document.getElementById('qr-prevPage');
        const nextBtn = document.getElementById('qr-nextPage');

        if (prevBtn) {
            prevBtn.onclick = () => {
                if (qrCurrentPage > 1) {
                    qrCurrentPage--;
                    displayQRPage(qrCurrentPage);
                    updateQRPagination(qrAllData.length);
                }
            };
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                const totalPages = Math.ceil(qrAllData.length / qrPageSize);
                if (qrCurrentPage < totalPages) {
                    qrCurrentPage++;
                    displayQRPage(qrCurrentPage);
                    updateQRPagination(qrAllData.length);
                }
            };
        }
    } catch (error) {
        console.error('绑定QR分页事件失败:', error);
        window.showToast('初始化失败', 'error');
    }
}

// 加载 QR 节点列表
async function loadQRNodes() {
    try {
        const response = await axios.get('/api/QueryRetrieve/nodes');
        const nodes = response.data;

        const select = document.getElementById('qrNode');
        if (!select) return;

        if (nodes.length === 0) {
            select.innerHTML = '<option value="">未配置PACS节点</option>';
            return;
        }

        select.innerHTML = nodes.map(node => `
            <option value="${node.name}">${node.name} (${node.aeTitle}@${node.hostName})</option>
        `).join('');
        
        // 恢复之前选择的节点，如果没有则使用默认节点
        if (selectedQRNode) {
            select.value = selectedQRNode;
        } else {
            const defaultNode = nodes.find(n => n.isDefault);
            if (defaultNode) {
                select.value = defaultNode.name;
            }
            selectedQRNode = select.value;
        }

        // 监听节点选择变化
        select.addEventListener('change', (e) => {
            selectedQRNode = e.target.value;
        });

    } catch (error) {
        console.error('加载PACS节点失败:', error);
        window.showToast('加载失败', 'error');
    }
}

// 执行 QR 查询
async function searchQR() {
    const tbody = document.getElementById('qr-table-body');
    showTableLoading(tbody, 9);  // QR列表有9列

    const nodeId = document.getElementById('qrNode').value;
    if (!nodeId) {
        showEmptyTable(tbody, '请选择PACS节点', 9);
        return;
    }

    const queryParams = {
        patientId: document.getElementById('qrPatientId').value,
        patientName: document.getElementById('qrPatientName').value,
        accessionNumber: document.getElementById('qrAccessionNumber').value,
        modality: document.getElementById('qrModality').value,
        studyDate: document.getElementById('qrStudyDate').value
    };

    try {
        // 默认使用 study 级别查询
        const response = await axios.post(`/api/QueryRetrieve/${nodeId}/query?level=STUDY`, queryParams);
        const result = response.data;

        if (!result.success) {
            showEmptyTable(tbody, result.message || '查询失败', 9);
            return;
        }

        if (!result.data || result.data.length === 0) {
            showEmptyTable(tbody, '未找到匹配的检查', 9);
            return;
        }

        // 更新数据和显示
        qrAllData = result.data;
        qrCurrentPage = 1;
        displayQRPage(qrCurrentPage);
        updateQRPagination(result.total);

    } catch (error) {
        console.error('查询失败:', error);
        showEmptyTable(tbody, '查询失败，请重试', 9);
    }
}

// 显示 QR 查询结果页
function displayQRPage(page) {
    const tbody = document.getElementById('qr-table-body');
    if (!tbody) return;

    const start = (page - 1) * qrPageSize;
    const end = start + qrPageSize;
    const pageItems = qrAllData.slice(start, end);

    const fragment = document.createDocumentFragment();
    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-study-uid', item.studyInstanceUid);
        tr.setAttribute('onclick', 'toggleQRSeriesInfo(this)');
        tr.innerHTML = `
            <td>${item.patientId || ''}</td>
            <td>${item.patientName || ''}</td>
            <td>${item.accessionNumber || ''}</td>
            <td>${item.modalities || item.modality || ''}</td>
            <td>${formatQRDate(item.studyDate) || ''}</td>
            <td>${item.studyDescription || ''}</td>
            <td>${item.numberOfSeries || 0}</td>
            <td>${item.numberOfInstances || 0}</td>
            <td>
                <button class="btn btn-sm btn-success" onclick="moveQRStudy('${item.studyInstanceUid}', event)">
                    <i class="bi bi-cloud-download me-1"></i>cmove
                </button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// 更新 QR 分页信息
function updateQRPagination(total) {
    const totalPages = Math.ceil(total / qrPageSize);
    const start = (qrCurrentPage - 1) * qrPageSize + 1;
    const end = Math.min(qrCurrentPage * qrPageSize, total);
    
    document.getElementById('qr-currentRange').textContent = total > 0 ? `${start}-${end}` : '0-0';
    document.getElementById('qr-totalCount').textContent = total;
    document.getElementById('qr-currentPage').textContent = qrCurrentPage;
    
    document.getElementById('qr-prevPage').disabled = qrCurrentPage === 1;
    document.getElementById('qr-nextPage').disabled = qrCurrentPage === totalPages || total === 0;
}

// 切换序列信息显示
async function toggleQRSeriesInfo(row) {
    const studyUid = $(row).data('study-uid');
    const seriesRow = $(row).next('.series-info');
    
    if (seriesRow.is(':visible')) {
        seriesRow.hide();
        return;
    }

    try {
        // 显示加载动画
        const loadingRow = $(`
            <tr class="series-info">
                <td colspan="9" class="text-center py-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                </td>
            </tr>
        `);
        $(row).after(loadingRow);

        const nodeId = document.getElementById('qrNode').value;
        // 使用 series 级别查询
        const response = await axios.post(`/api/QueryRetrieve/${nodeId}/query?level=SERIES`, {
            studyInstanceUid: studyUid
        });
        const result = response.data;

        if (!result.success || !result.data) {
            throw new Error(result.message || '获取序列数据失败');
        }

        // 创建序列信息行
        const seriesInfoRow = $(`
            <tr class="series-info">
                <td colspan="9">
                    <div class="series-container">
                        <table class="table table-sm table-bordered series-detail-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px">序列号</th>
                                    <th style="width: 100px">检查类型</th>
                                    <th style="width: 500px">序列描述</th>
                                    <th style="width: 80px">图像数量</th>
                                    <th style="width: 80px">操作</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </td>
            </tr>
        `);

        const tbody = seriesInfoRow.find('tbody');
        if (!result.data || result.data.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="5" class="text-center text-muted py-3">
                        <i class="bi bi-inbox fs-2 mb-2 d-block"></i>
                        暂无序列数据
                    </td>
                </tr>
            `);
        } else {
            result.data.forEach(series => {
                tbody.append(`
                    <tr>
                        <td>${series.seriesNumber || ''}</td>
                        <td>${series.modality || '未知'}</td>
                        <td title="${series.seriesDescription || ''}">${series.seriesDescription || ''}</td>
                        <td>${series.numberOfInstances || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-success" onclick="moveQRSeries('${studyUid}', '${series.seriesInstanceUid}', event)">
                                <i class="bi bi-cloud-download me-1"></i>cmove
                            </button>
                        </td>
                    </tr>
                `);
            });
        }

        // 移除加载动画和已存在的序列信息行
        $(row).siblings('.series-info').remove();
        // 添加新的序列信息行
        $(row).after(seriesInfoRow);

    } catch (error) {
        console.error('获取序列数据失败:', error);
        window.showToast(error.message || '获取失败', 'error');
        // 移除加载动画
        $(row).siblings('.series-info').remove();
    }
}

// 获取检查
async function moveQRStudy(studyUid, event) {
    if (event) {
        event.stopPropagation();
    }

    // 使用确认对话框
    if (!await showConfirmDialog('确认获取', '确定要获取选中的检查吗？')) {
        return;  // 用户取消
    }

    const nodeId = document.getElementById('qrNode').value;
    try {
        const response = await axios.post(`/api/QueryRetrieve/${nodeId}/move?level=STUDY`, {
            studyInstanceUid: studyUid
        });
        const result = response.data;

        if (result.success) {
            window.showToast(result.message || '检查获取请求已发送，请稍后在影像管理中查看！', 'success');
        } else {
            throw new Error(result.message || '获取失败');
        }
    } catch (error) {
        console.error('获取失败:', error);
        window.showToast(error.response?.data?.message || error.message || '获取失败，请检查网络连接', 'error');
    }
}

// 获取单个序列
async function moveQRSeries(studyUid, seriesUid, event) {
    if (event) {
        event.stopPropagation();
    }

    // 使用确认对话框
    if (!await showConfirmDialog('确认获取', '确定要获取选中的序列吗？')) {
        return;  // 用户取消
    }

    const nodeId = document.getElementById('qrNode').value;
    try {
        const response = await axios.post(`/api/QueryRetrieve/${nodeId}/move?level=SERIES`, {
            studyInstanceUid: studyUid,
            seriesInstanceUid: seriesUid
        });
        const result = response.data;

        if (result.success) {
            window.showToast(result.message || '序列获取请求已发送，请稍后在影像管理中查看！', 'success');
        } else {
            throw new Error(result.message || '获取失败');
        }
    } catch (error) {
        console.error('获取失败:', error);
        window.showToast(error.response?.data?.message || error.message || '获取失败，请检查网络连接', 'error');
    }
}

// 重置 QR 查询条件
function resetQRSearch() {
    // 重置表单
    document.getElementById('qrSearchForm').reset();
    
    // 清空结果
    qrAllData = [];
    qrCurrentPage = 1;
    
    // 更新显示
    const tbody = document.getElementById('qr-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center">请输入查询条件</td>
        </tr>
    `;
    
    // 更新分页信息
    updateQRPagination(0);
}

// 格式化日期
function formatQRDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');
}

