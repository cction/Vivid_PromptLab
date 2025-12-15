document.addEventListener('DOMContentLoaded', () => {
    // 全局状态
    let catalogData = [];
    let currentCategory = 'all'; // 'all', 'collections', or category name
    let searchQuery = '';
    let sortBy = 'timestamp'; // 'timestamp' or 'title_order'
    
    // DOM 元素
    const categoryListEl = document.getElementById('category-list');
    const cardGridEl = document.getElementById('card-grid');
    const searchInput = document.getElementById('search-input');
    const sortBtn = document.getElementById('sort-btn');
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    const closeModal = document.getElementsByClassName('close-modal')[0];
    
    // 提示词模态框元素
    const promptModal = document.getElementById('prompt-modal');
    const closePromptModal = document.getElementById('close-prompt-modal');
    const modalPromptText = document.getElementById('modal-prompt-text');
    const modalCopyBtn = document.getElementById('modal-copy-btn');
    const modalCopyTryBtn = document.getElementById('modal-copy-try-btn');

    // 图片模态框导航元素
    const modalPrevBtn = document.getElementById('modal-prev-btn');
    const modalNextBtn = document.getElementById('modal-next-btn');
    let currentModalImages = [];
    let currentModalIndex = 0;

    // Intersection Observer 用于懒加载图片
    const observerOptions = {
        root: null, // viewport
        rootMargin: '100px', // 提前加载
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, observerOptions);

    // 滚动隐藏头部逻辑
    let lastScrollTop = 0;
    let headerScrollTimeout;
    const header = document.getElementById('site-header');
    const scrollWrapper = document.getElementById('scroll-wrapper');
    
    scrollWrapper.addEventListener('scroll', () => {
        const scrollTop = scrollWrapper.scrollTop;
        
        // 防抖头部状态变化，避免频繁触发布局重计算
        clearTimeout(headerScrollTimeout);
        headerScrollTimeout = setTimeout(() => {
            if (scrollTop > 100) {
                // 滚动超过100px时，根据滚动方向决定头部状态
                if (scrollTop > lastScrollTop) {
                    // 向下滚动，隐藏头部
                    if (header.style.height !== '0') {
                        isHeaderAnimating = true;
                        header.style.height = '0';
                        header.style.opacity = '0';
                        // 头部高度变化后，延迟重新布局以避免闪烁
                        setTimeout(() => {
                            layoutCache.containerWidth = 0; // 强制重新计算布局
                            isHeaderAnimating = false;
                            if (!isLayouting) {
                                debouncedLayoutCards();
                            }
                        }, 350); // 等待CSS动画完成 + 缓冲时间
                    }
                }
                // 向上滚动但未到顶部时，保持头部隐藏状态
                // 不做任何操作，让头部保持当前状态
            } else {
                // 滚动位置在100px以内（接近顶部），显示头部
                if (header.style.height !== '20vh') {
                    isHeaderAnimating = true;
                    header.style.height = '20vh';
                    header.style.opacity = '1';
                    // 头部高度变化后，延迟重新布局以避免闪烁
                    setTimeout(() => {
                        layoutCache.containerWidth = 0; // 强制重新计算布局
                        isHeaderAnimating = false;
                        if (!isLayouting) {
                            debouncedLayoutCards();
                        }
                    }, 350); // 等待CSS动画完成 + 缓冲时间
                }
            }
            
            lastScrollTop = scrollTop;
        }, 100); // 100ms防抖延迟
    });

    // 初始化
    fetchCatalog();

    // 事件监听
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        
        // 防抖搜索
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            debouncedRenderCards();
        }, 200); // 200ms防抖延迟
    });

    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            // 防止在渲染过程中切换排序
            if (isRendering) return;
            
            if (sortBy === 'timestamp') {
                sortBy = 'title_order';
                sortBtn.innerHTML = '排序方式：名称';
                sortBtn.title = "当前按名称排序，点击切换按时间";
            } else {
                sortBy = 'timestamp';
                sortBtn.innerHTML = '排序方式：最新';
                sortBtn.title = "当前按时间排序，点击切换按名称";
            }
            
            // 防抖渲染
            debouncedRenderCards();
        });
    }

    // 模态框关闭
    closeModal.onclick = () => modal.style.display = "none";
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
    };

    // 图片模态框导航事件
    if (modalPrevBtn && modalNextBtn) {
        modalPrevBtn.onclick = (e) => {
            e.stopPropagation();
            showPrevImage();
        };
        modalNextBtn.onclick = (e) => {
            e.stopPropagation();
            showNextImage();
        };
    }

    function showPrevImage() {
        if (currentModalImages.length <= 1) return;
        currentModalIndex = (currentModalIndex - 1 + currentModalImages.length) % currentModalImages.length;
        updateModalImage();
    }

    function showNextImage() {
        if (currentModalImages.length <= 1) return;
        currentModalIndex = (currentModalIndex + 1) % currentModalImages.length;
        updateModalImage();
    }

    function updateModalImage() {
        modalImg.src = currentModalImages[currentModalIndex];
        // 可以在这里更新 caption 或其他信息
    }

    function openImageModal(imageUrls, index) {
        currentModalImages = imageUrls;
        currentModalIndex = index;
        updateModalImage();
        modal.style.display = "block";

        // 如果只有一张图，隐藏导航按钮
        if (currentModalImages.length > 1) {
            modalPrevBtn.style.display = "flex";
            modalNextBtn.style.display = "flex";
        } else {
            modalPrevBtn.style.display = "none";
            modalNextBtn.style.display = "none";
        }
    }

    // 提示词模态框关闭
    if (closePromptModal) {
        closePromptModal.onclick = () => promptModal.style.display = "none";
        promptModal.onclick = (e) => {
            if (e.target === promptModal) promptModal.style.display = "none";
        };
    }

    // 获取目录数据
    async function fetchCatalog() {
        try {
            const response = await fetch('catalog.json');
            if (!response.ok) throw new Error('Failed to load catalog.json');
            const data = await response.json();
            
            // 兼容 catalog.json 可能是列表或对象的情况
            // 根据之前的任务，现在是列表结构
            if (Array.isArray(data)) {
                catalogData = data;
            } else if (data.catalog && Array.isArray(data.catalog)) {
                catalogData = data.catalog;
            } else {
                console.error('Unknown catalog format', data);
                return;
            }

            renderSidebar();
            renderCards();
        } catch (error) {
            console.error('Error fetching catalog:', error);
            cardGridEl.innerHTML = '<p style="text-align:center; width:100%; padding:20px;">加载失败，请检查 catalog.json 是否存在。</p>';
        }
    }

    // 渲染侧边栏
    function renderSidebar() {
        categoryListEl.innerHTML = '';

        // 计算全部数量
        let allCount = 0;
        catalogData.forEach(cat => {
            allCount += cat.projects ? cat.projects.length : 0;
        });

        // 固定选项：全部
        const allLi = createSidebarItem('全部', 'all', true, allCount);
        categoryListEl.appendChild(allLi);

        // 动态分类
        catalogData.forEach(category => {
            // 使用后端提供的 number 字段
            const count = category.number !== undefined ? category.number : (category.projects ? category.projects.length : 0);
            const li = createSidebarItem(category.name, category.name, false, count);
            categoryListEl.appendChild(li);
        });
    }

    function createSidebarItem(text, value, isActive, count) {
        const li = document.createElement('li');
        
        // 使用 span 包裹文本和数量，方便布局
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'category-count';
        countSpan.textContent = count;

        li.appendChild(textSpan);
        li.appendChild(countSpan);

        if (isActive) li.classList.add('active');
        
        li.addEventListener('click', () => {
            // 防止重复点击
            if (currentCategory === value || isRendering) return;
            
            // 更新激活状态
            document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            
            // 更新当前分类并重新渲染
            currentCategory = value;
            
            // 防抖渲染
            debouncedRenderCards();
        });
        
        return li;
    }

    // 缓存已创建的卡片元素
    let cardCache = new Map();
    let currentProjects = [];
    
    // 防止并发渲染的标志
    let isRendering = false;
    let pendingRenderRequest = null;
    
    // 头部动画状态标志
    let isHeaderAnimating = false;
    
    // 防抖渲染函数
    let renderTimeout;
    function debouncedRenderCards() {
        // 取消之前的渲染请求
        if (renderTimeout) {
            clearTimeout(renderTimeout);
        }
        if (pendingRenderRequest) {
            cancelAnimationFrame(pendingRenderRequest);
        }
        
        // 设置新的渲染请求
        renderTimeout = setTimeout(() => {
            pendingRenderRequest = requestAnimationFrame(() => {
                renderCards();
                pendingRenderRequest = null;
            });
        }, 50); // 50ms防抖延迟
    }

    // 渲染卡片 - 优化版本
    function renderCards() {
        // 防止并发渲染
        if (isRendering) return;
        isRendering = true;
        
        // 显示加载状态
        showLoadingState();
        let filteredProjects = [];

        // 1. 筛选分类
        if (currentCategory === 'all') {
            catalogData.forEach(cat => {
                cat.projects.forEach(proj => {
                    // 附加分类名称以便后续构建路径
                    filteredProjects.push({ ...proj, categoryName: cat.name });
                });
            });
        } else {
            const category = catalogData.find(c => c.name === currentCategory);
            if (category) {
                category.projects.forEach(proj => {
                    filteredProjects.push({ ...proj, categoryName: category.name });
                });
            }
        }

        // 2. 搜索过滤
        if (searchQuery) {
            filteredProjects = filteredProjects.filter(p => {
                const titleMatch = (p.title || '').toLowerCase().includes(searchQuery);
                const authorMatch = (p.author || '').toLowerCase().includes(searchQuery);
                return titleMatch || authorMatch;
            });
        }

        // 3. 分组与排序
        // 分离精选卡片和普通卡片
        const collectionProjects = filteredProjects.filter(p => p.collections);
        const otherProjects = filteredProjects.filter(p => !p.collections);

        // 定义排序函数
        const sortFunc = (a, b) => {
            if (sortBy === 'timestamp') {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                return timeB - timeA; // 降序
            } else {
                // title_order 排序 (升序)
                const orderA = a.title_order !== undefined ? a.title_order : 999999;
                const orderB = b.title_order !== undefined ? b.title_order : 999999;
                return orderA - orderB;
            }
        };

        // 分别排序
        collectionProjects.sort(sortFunc);
        otherProjects.sort(sortFunc);

        // 合并：精选在前，其他在后
        const projectsToShow = [...collectionProjects, ...otherProjects];
        currentProjects = projectsToShow;

        // 4. 高效更新DOM
        updateCardGrid(projectsToShow);
        
        // 渲染完成，重置状态
        isRendering = false;
        hideLoadingState();
    }

    // 高效更新卡片网格
    function updateCardGrid(projects) {
        if (projects.length === 0) {
            cardGridEl.innerHTML = '<p style="text-align:center; width:100%; color:#888;">没有找到相关模板。</p>';
            return;
        }

        // 使用DocumentFragment批量操作DOM，避免直接清空造成闪烁
        const fragment = document.createDocumentFragment();
        const newProjectKeys = new Set();

        projects.forEach(project => {
            const projectKey = `${project.categoryName}-${project.title}`;
            newProjectKeys.add(projectKey);
            
            let card = cardCache.get(projectKey);
            
            if (!card) {
                // 创建新卡片并缓存
                card = createCardElement(project);
                cardCache.set(projectKey, card);
            }
            
            // 确保卡片可见
            card.style.display = 'block';
            
            // 按顺序添加到fragment
            fragment.appendChild(card);
        });

        // 一次性替换所有内容，减少DOM操作
        cardGridEl.innerHTML = '';
        cardGridEl.appendChild(fragment);

        // 延迟布局以提高响应性
        requestAnimationFrame(() => {
            layoutCards();
        });
    }

    // 布局缓存
    let layoutCache = {
        containerWidth: 0,
        colCount: 0,
        leftOffset: 0
    };
    
    // 防抖布局函数
    let layoutTimeout;
    let isLayouting = false;
    
    function debouncedLayoutCards() {
        clearTimeout(layoutTimeout);
        layoutTimeout = setTimeout(() => {
            if (!isLayouting && !isHeaderAnimating) {
                layoutCards();
            }
        }, 16); // ~60fps
    }

    // 瀑布流布局逻辑 - 优化版本
    function layoutCards() {
        // 防止并发布局
        if (isLayouting) return;
        isLayouting = true;
        
        const cards = Array.from(cardGridEl.getElementsByClassName('card')).filter(card => 
            card.style.display !== 'none'
        );
        
        if (cards.length === 0) {
            cardGridEl.style.height = 'auto';
            isLayouting = false;
            return;
        }

        const containerWidth = cardGridEl.clientWidth;
        const cardWidth = 240; // Fixed width as per CSS
        const gap = 25; // Gap between cards

        // 检查是否需要重新计算布局参数
        if (layoutCache.containerWidth !== containerWidth) {
            // 计算列数
            let colCount = Math.floor((containerWidth + gap) / (cardWidth + gap));
            colCount = Math.max(1, colCount);

            // 计算实际内容宽度并居中
            const contentWidth = colCount * cardWidth + (colCount - 1) * gap;
            const leftOffset = Math.max(0, (containerWidth - contentWidth) / 2);

            // 更新缓存
            layoutCache = {
                containerWidth,
                colCount,
                leftOffset
            };
        }

        const { colCount, leftOffset } = layoutCache;
        
        // 初始化列高度数组
        const colHeights = new Array(colCount).fill(0);

        // 批量更新样式以减少重排
        const updates = [];
        
        cards.forEach(card => {
            // 找到当前高度最小的列
            let minColIndex = 0;
            let minColHeight = colHeights[0];

            for (let i = 1; i < colCount; i++) {
                if (colHeights[i] < minColHeight) {
                    minColHeight = colHeights[i];
                    minColIndex = i;
                }
            }

            // 计算位置
            const left = leftOffset + minColIndex * (cardWidth + gap);
            const top = minColHeight;

            // 收集更新信息而不是立即应用
            updates.push({ card, left, top });

            // 更新该列高度
            const cardHeight = card.offsetHeight;
            colHeights[minColIndex] += cardHeight + gap;
        });

        // 批量应用样式更新
        updates.forEach(({ card, left, top }) => {
            card.style.transform = `translate(${left}px, ${top}px)`;
        });

        // 设置容器高度
        const maxColHeight = Math.max(...colHeights);
        cardGridEl.style.height = `${Math.max(0, maxColHeight - gap)}px`;
        
        // 布局完成
        isLayouting = false;
    }

    // 监听窗口大小变化 - 优化版本
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // 清除布局缓存以强制重新计算
            layoutCache.containerWidth = 0;
            if (!isLayouting && !isHeaderAnimating) {
                layoutCards();
            }
        }, 150); // 减少延迟提高响应性
    });

    // 创建卡片 DOM
    function createCardElement(project) {
        const card = document.createElement('div');
        card.className = 'card';
        // 初始位置移出屏幕，防止 IntersectionObserver 在布局前误判为可见
        card.style.transform = 'translate(-9999px, -9999px)';
        
        // 存储元数据路径所需信息
        card.dataset.category = project.categoryName;
        card.dataset.title = project.title;
        card.dataset.metaPath = project.meta_path;

        // 检查是否为精选，如果是则添加图标
        const collectionIcon = project.collections 
            ? '<img src="./src/collections.svg" class="collection-icon" alt="Featured">' 
            : '';

        // 骨架结构
        card.innerHTML = `
            <div class="card-image-container">
                ${collectionIcon}
                <div class="skeleton-text" style="height:100%; background:#f0f0f0;"></div>
            </div>
            <div class="card-body">
                <div class="card-header">
                    <div class="card-title" title="${project.title}">${project.title}</div>
                    ${project.author ? `<div class="card-author" title="${project.author}">@${truncateText(project.author, 15)}</div>` : ''}
                </div>
                <div class="card-prompt">
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text" style="width:60%"></div>
                </div>
                <div class="card-actions">
                    <button class="action-btn translate-btn" disabled title="切换语言">
                        原/译文
                    </button>
                    <button class="action-btn simple-copy-btn" title="复制提示词">
                        复制
                    </button>
                    <button class="action-btn copy-btn" title="复制提示词并尝试">
                        复制并尝试
                    </button>
                </div>
            </div>
        `;

        // 优先使用 catalog.json 中的图片信息渲染
        if (project.imgs && project.imgs.length > 0) {
            renderCardImages(card, project.imgs, project.categoryName, project.title, project.imgs_details);
        }

        // 使用 catalog.json 中的提示词信息渲染
        const promptContainer = card.querySelector('.card-prompt');
        const translateBtn = card.querySelector('.translate-btn');
        
        // 提取数据
        const promptOriginShort = project.prompt_origin || '';
        const promptCnShort = project.prompt_cn || '';
        const hasCn = !!promptCnShort && promptCnShort.trim() !== '';
        
        // 初始化状态
        card._isCn = hasCn;
        card._promptOriginShort = promptOriginShort;
        card._promptCnShort = promptCnShort;

        // 定义更新显示的函数
        const updateDisplayText = () => {
             const text = card._isCn ? card._promptCnShort : card._promptOriginShort;
             // 这里的30是前端截断长度，如果后端已经截断，这里再截断一次也是安全的
             promptContainer.textContent = truncateText(text, 30);
        };
        
        // 初始化显示
        updateDisplayText();
        
        // 绑定翻译按钮
        if (hasCn) {
            translateBtn.disabled = false;
            translateBtn.onclick = () => {
                 card._isCn = !card._isCn;
                 updateDisplayText();
                 
                 // 动画效果
                 promptContainer.style.opacity = 0;
                 requestAnimationFrame(() => {
                     promptContainer.style.transition = 'opacity 0.2s';
                     promptContainer.style.opacity = 1;
                 });
            };
        } else {
            translateBtn.disabled = true;
            translateBtn.style.opacity = 0.5;
        }

        // 绑定普通复制按钮
        const simpleCopyBtn = card.querySelector('.simple-copy-btn');
        simpleCopyBtn.onclick = (e) => {
            e.stopPropagation();
            loadFullPromptAndCopy(card, simpleCopyBtn, false);
        };

        // 绑定复制并尝试按钮 (延迟加载完整提示词)
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            loadFullPromptAndCopy(card, copyBtn, true);
        };

        return card;
    }

    // 辅助函数：截断文本
    const truncateText = (text, limit) => {
        if (!text) return '';
        if (text.length > limit) {
            return text.substring(0, limit) + '...';
        }
        return text;
    };

    // 渲染卡片图片
    function renderCardImages(card, imgs, category, title, imgs_details) {
        const imgContainer = card.querySelector('.card-image-container');
        
        if (imgs.length > 0) {
            // 清除骨架
            const skeleton = imgContainer.querySelector('.skeleton-text');
            if(skeleton) skeleton.remove();

            // 创建图片元素 (仅显示第一张)
            const imgPath = imgs[0];
            // 从路径提取文件名用于匹配尺寸信息
            const imgName = imgPath.split('/').pop();
            
            const img = document.createElement('img');
            img.className = 'card-image';
            
            // 尝试获取尺寸信息并预设高度
            let hasSize = false;
            if (imgs_details && imgs_details.length > 0) {
                const detail = imgs_details.find(d => d.name === imgName);
                if (detail && detail.width > 0 && detail.height > 0) {
                    // 卡片宽度固定为 240px (参考 layoutCards 中的 cardWidth)
                    const cardWidth = 240;
                    const displayHeight = (detail.height / detail.width) * cardWidth;
                    img.style.height = `${displayHeight}px`;
                    hasSize = true;
                }
            }

            img.dataset.src = imgPath;
                
            // 如果没有预设尺寸，加载完成后仍需重新布局
            if (!hasSize) {
                img.onload = () => {
                        // 只有在不处于头部动画状态时才触发布局
                        if (!isLayouting) {
                            debouncedLayoutCards();
                        }
                };
            }
            
            // 点击放大，传递图片列表
            const allImageUrls = imgs;
            img.onclick = () => {
                openImageModal(allImageUrls, 0);
            };

            imgContainer.appendChild(img);
            
            // 在图片被添加到DOM后再开始观察
            observer.observe(img);

        } else {
            // 无图片处理
             const skeleton = imgContainer.querySelector('.skeleton-text');
             if(skeleton) {
                 skeleton.style.background = '#e0e0e0';
                 skeleton.innerHTML = '<span style="display:flex;justify-content:center;align-items:center;height:100%;color:#999;font-size:12px;padding:20px 0;">暂无图片</span>';
             }
        }
    }

    // 加载单个卡片的详细数据 (meta.json)
    // 仅在需要完整提示词时调用
    async function loadFullPromptAndCopy(card, copyBtn, shouldJump = true) {
        const category = card.dataset.category;
        const title = card.dataset.title;
        // 直接使用 metaPath
        let metaPath = card.dataset.metaPath;

        // 确保路径指向 meta.json
        // 如果 metaPath 是目录路径（不以 .json 结尾），则追加 meta.json
        if (metaPath && !metaPath.toLowerCase().endsWith('.json')) {
            if (!metaPath.endsWith('/')) {
                metaPath += '/';
            }
            metaPath += 'meta.json';
        }
        
        const originalBtnText = shouldJump ? '复制并尝试' : '复制';

        // 如果已经加载过完整数据，直接使用
        if (card._fullPromptOrigin && card._fullPromptCn) {
             const textToCopy = card._isCn ? card._fullPromptCn : card._fullPromptOrigin;
             performCopy(textToCopy, copyBtn, shouldJump, originalBtnText);
             return;
        }

        try {
            // 显示加载状态
            copyBtn.innerHTML = '加载中...';
            copyBtn.disabled = true;

            let meta;
            let loaded = false;
            let loadErrors = [];

            // 策略调整：优先尝试本地路径，失败后再尝试远程路径
            // 这样在本地开发环境或完整部署环境中，会优先读取 catalog_meta 文件夹下的文件
            
            // 1. 尝试构建本地路径
            // 结构: catalog_meta/Category/Project/meta.json
            if (category && title) {
                try {
                    const localPath = `catalog_meta/${category}/${title}/meta.json`;
                    const response = await fetch(localPath);
                    if (response.ok) {
                        meta = await response.json();
                        loaded = true;
                    } else {
                        loadErrors.push(`Local path ${localPath} returned ${response.status}`);
                    }
                } catch (err) {
                    loadErrors.push(`Local path error: ${err.message}`);
                }
            }

            // 2. 如果本地未加载成功，尝试直接加载 metaPath (可能是远程 URL)
            if (!loaded && metaPath) {
                try {
                    const response = await fetch(metaPath);
                    if (response.ok) {
                        meta = await response.json();
                        loaded = true;
                    } else {
                        loadErrors.push(`MetaPath ${metaPath} returned ${response.status}`);
                    }
                } catch (err) {
                    loadErrors.push(`MetaPath error: ${err.message}`);
                }
            }

            if (!loaded) {
                throw new Error('All meta fetch attempts failed. Errors: ' + loadErrors.join('; '));
            }

            // 保存完整数据
            card._fullPromptOrigin = meta.prompt_origin || '';
            card._fullPromptCn = meta.prompt_cn || '';
            
            // 执行复制
            const textToCopy = card._isCn ? card._fullPromptCn : card._fullPromptOrigin;
            performCopy(textToCopy, copyBtn, shouldJump, originalBtnText);
        } catch (error) {
            console.warn(`Failed to load meta for ${title}:`, error);
            // 降级策略：如果加载失败，尝试复制 catalog.json 中的短文本（或者提示失败）
            // 这里选择复制短文本以保证基本体验，或者提示错误
            const textToCopy = card._isCn ? card._promptCnShort : card._promptOriginShort;
            if (textToCopy) {
                performCopy(textToCopy, copyBtn, shouldJump, originalBtnText);
                // 提示用户使用的是降级版本（可选，暂时不打扰用户）
            } else {
                copyBtn.innerHTML = '复制失败';
                setTimeout(() => {
                    copyBtn.innerHTML = originalBtnText;
                    copyBtn.disabled = false;
                }, 1500);
            }
        }
    }

    function performCopy(text, btn, shouldJump, originalBtnText) {
        navigator.clipboard.writeText(text).then(() => {
            // 恢复按钮状态（如果是从加载状态恢复）
            btn.disabled = false;
            
            btn.innerHTML = '已复制';
            setTimeout(() => {
                btn.innerHTML = originalBtnText;
            }, 1500);
            
            if (shouldJump) {
                // 打开新标签页
                window.open('https://www.leaderai.top/#/smart-image', '_blank');
            }
        }).catch(err => {
            console.error('Copy failed', err);
            btn.disabled = false;
            btn.innerHTML = '复制失败';
            setTimeout(() => {
                btn.innerHTML = originalBtnText;
            }, 1500);
        });
    }

    // 加载状态管理
    let loadingStateCount = 0;
    
    function showLoadingState() {
        loadingStateCount++;
        if (loadingStateCount === 1) {
            cardGridEl.style.opacity = '0.6';
            cardGridEl.style.pointerEvents = 'none';
        }
    }
    
    function hideLoadingState() {
        loadingStateCount = Math.max(0, loadingStateCount - 1);
        if (loadingStateCount === 0) {
            cardGridEl.style.opacity = '1';
            cardGridEl.style.pointerEvents = 'auto';
        }
    }

    // 使用 requestIdleCallback 的兼容性处理
    if (!window.requestIdleCallback) {
        window.requestIdleCallback = function(cb) {
            return setTimeout(cb, 1);
        };
    }
});
