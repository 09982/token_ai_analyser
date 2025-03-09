// src/content.js
const solanaTokenPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const excludeList = [];
const HOVER_DELAY = 300;
const CLOSE_DELAY = 500;

let activePreview = null;
let showTimer = null;
let closeTimer = null;
let stylesAdded = false;

function addStyles() {
  if (stylesAdded) return;
  
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .sol-token-highlight {
      color: #1DA1F2;
      font-weight: bold;
      cursor: pointer;
      position: relative;
      border-bottom: 1px dotted #1DA1F2;
    }
    
    .sol-token-highlight:hover {
      background-color: rgba(29, 161, 242, 0.1);
    }
    
    .sol-token-preview {
      position: absolute;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 3px 15px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      overflow: hidden;
      width: 25vw;
      min-width: 320px;
      max-width: 600px;
      transition: opacity 0.2s ease, transform 0.2s ease;
      font-family: Arial, sans-serif;
      border: 1px solid #e1e8ed;
      display: flex;
      flex-direction: column;
    }
    
    .sol-token-preview-header {
      background-color: #1DA1F2;
      color: white;
      padding: 10px 15px;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: move; /* Indicate draggable */
      flex-shrink: 0;
    }
    
    .sol-token-preview-title {
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: calc(100% - 50px);
    }
    
    .sol-token-tabs {
      display: flex;
      background-color: #f0f3f5;
      border-bottom: 1px solid #e1e8ed;
      flex-shrink: 0;
    }
    
    .sol-token-preview-body {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: auto;
    }

    .sol-token-preview-iframe {
      border: none;
      width: 100%;
      height: 100%;
      flex: 1;
      min-height: 0; /* Allow iframe to shrink properly */
    }
    
    .sol-token-tab-content {
      display: none;
      height: 100%;
      overflow: hidden;
    }
    
    .sol-token-tab-content.active {
      display: flex;
      flex-direction: column;
    }
    
    .sol-token-preview-footer {
      padding: 8px 15px;
      background-color: #f8f9fa;
      font-size: 13px;
      border-top: 1px solid #e1e8ed;
      flex-shrink: 0;
      position: relative;
      z-index: 10001;
    }
    
    .sol-footer-buttons {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
    }
    
    .sol-footer-button {
      color: #1DA1F2;
      text-decoration: none;
      font-weight: bold;
      padding: 6px 8px;
      border-radius: 8px;
      background-color: #e8f5fe;
      transition: background-color 0.2s, transform 0.2s;
      text-align: center;
      flex: 1;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .sol-footer-button:hover {
      background-color: #cce7fb;
      transform: translateY(-2px);
    }
    
    .sol-token-tab {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      font-size: 13px;
    }
    
    .sol-token-tab.active {
      border-bottom: 2px solid #1DA1F2;
      font-weight: bold;
    }
    
    .sol-token-tab:hover {
      background-color: rgba(29, 161, 242, 0.1);
    }
    
    .sol-tweet-summary {
      font-size: 13px;
      line-height: 1.5;
      padding: 15px;
      overflow-y: auto;
      height: 100%;
    }
    
    .sol-tweet-summary h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #1DA1F2;
    }
    
    .sol-token-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #657786;
    }
    
    .sol-token-spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #1DA1F2;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: sol-spin 1s linear infinite;
      margin-right: 10px;
    }
    
    @keyframes sol-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Resize handle */
    .sol-resize-handle {
      position: absolute;
      width: 15px;
      height: 15px;
      bottom: 0;
      right: 0;
      cursor: nwse-resize;
      z-index: 10001;
    }
    
    .sol-resize-handle::after {
      content: '';
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      border-right: 2px solid #1DA1F2;
      border-bottom: 2px solid #1DA1F2;
    }

    .sol-token-market-info {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .sol-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-top: 8px;
    }

    .sol-info-item {
      display: flex;
      flex-direction: column;
      background: white;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid #e1e8ed;
    }

    .sol-info-label {
      font-size: 12px;
      color: #657786;
    }

    .sol-info-value {
      font-size: 14px;
      font-weight: 600;
      color: #1DA1F2;
      margin-top: 2px;
    }

    .sol-analysis-section {
      background: white;
      border: 1px solid #e1e8ed;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .sol-analysis-section h4 {
      color: #1DA1F2;
      font-size: 14px;
      margin: 0 0 8px 0;
    }

    .sol-analysis-content {
      font-size: 13px;
      line-height: 1.5;
    }

    .sol-analysis-point {
      padding: 6px 0;
      border-bottom: 1px solid #f0f3f5;
    }

    .sol-analysis-point:last-child {
      border-bottom: none;
    }

    .sol-error-message {
      color: #e74c3c;
      font-weight: 500;
      text-align: center;
      padding: 12px;
    }

    .sol-error-hint {
      color: #7f8c8d;
      font-size: 12px;
      text-align: center;
      margin-top: 8px;
    }

    .sol-error-detail {
      color: #95a5a6;
      font-size: 12px;
      text-align: center;
      margin-top: 4px;
    }
 
    
    /* Also adjust mobile view */
    @media (max-width: 768px) {
      .sol-token-preview {
        width: 85vw;
        min-width: 300px;
      }
      
      .sol-token-preview-body {
        min-height: 360px;
      }

      .sol-info-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  
  document.head.appendChild(styleElement);
  stylesAdded = true;
}

// Variables to track resizing and dragging
let isResizing = false;
let isDragging = false;
let initialMouseX = 0;
let initialMouseY = 0;
let initialWidth = 0;
let initialHeight = 0;
let initialTop = 0;
let initialLeft = 0;

// 扫描页面内容
function scanForSolanaTokens() {
  addStyles();
  
  const pageText = document.body.innerText;
  const matches = pageText.match(solanaTokenPattern);
  
  if (matches && matches.length > 0) {
    const uniqueTokens = [...new Set(matches)].filter(token => 
      !excludeList.includes(token)
    );
    
    uniqueTokens.forEach(token => {
      highlightToken(token);
    });
  }
}

// 查找包含特定文本的节点
function findTextNodesWithToken(element, token) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        return node.nodeValue.includes(token)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// 高亮Token并添加悬浮事件
function highlightToken(token) {
  const textNodes = findTextNodesWithToken(document.body, token);
  
  textNodes.forEach(node => {
    const parent = node.parentNode;
    if (parent.classList && parent.classList.contains('token-processed')) {
      return;
    }
    
    const text = node.nodeValue;
    
    if (text.includes(token)) {
      const parts = text.split(token);
      
      const fragment = document.createDocumentFragment();
      
      if (parts[0]) {
        fragment.appendChild(document.createTextNode(parts[0]));
      }
      
      const tokenSpan = document.createElement('span');
      tokenSpan.textContent = token;
      tokenSpan.className = 'sol-token-highlight token-processed';
      tokenSpan.setAttribute('data-token', token);
      
      tokenSpan.addEventListener('mouseenter', handleTokenMouseEnter);
      tokenSpan.addEventListener('mouseleave', handleTokenMouseLeave);
      
      tokenSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (activePreview) {
          closePreview(true);
        }
        
        window.open(`https://gmgn.ai/sol/token/fGPQ3uoC_${token}`, '_blank');
      });
      
      fragment.appendChild(tokenSpan);
      
      if (parts[1]) {
        fragment.appendChild(document.createTextNode(parts[1]));
      }
      
      parent.replaceChild(fragment, node);
    }
  });
}

// 处理鼠标进入Token的事件
function handleTokenMouseEnter(e) {
  const tokenSpan = e.target;
  const token = tokenSpan.getAttribute('data-token');
  
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  
  if (!activePreview) {
    showTimer = setTimeout(() => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      showPreview(token, mouseX, mouseY);
    }, HOVER_DELAY);
  }
}

// 处理鼠标离开Token的事件
function handleTokenMouseLeave() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  
  if (activePreview) {
    closeTimer = setTimeout(() => {
      closePreview();
    }, CLOSE_DELAY);
  }
}

// 添加调整大小的手柄
function addResizeHandle(preview) {
  const handle = document.createElement('div');
  handle.className = 'sol-resize-handle';
  
  handle.addEventListener('mousedown', handleResizeStart);
  
  preview.appendChild(handle);
}

// 添加拖拽功能到标题栏
function makeHeaderDraggable(header, preview) {
  header.addEventListener('mousedown', (e) => {
    if (isResizing) return;
    
    isDragging = true;
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;
    initialLeft = parseInt(preview.style.left) || preview.getBoundingClientRect().left;
    initialTop = parseInt(preview.style.top) || preview.getBoundingClientRect().top;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  });
}

// 处理拖拽移动
function handleDragMove(e) {
  if (!isDragging || !activePreview) return;
  
  const deltaX = e.clientX - initialMouseX;
  const deltaY = e.clientY - initialMouseY;
  
  activePreview.style.left = (initialLeft + deltaX) + 'px';
  activePreview.style.top = (initialTop + deltaY) + 'px';
}

// 处理拖拽结束
function handleDragEnd() {
  isDragging = false;
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
}

// 开始调整大小的处理函数
function handleResizeStart(e) {
  e.preventDefault();
  e.stopPropagation();
  
  if (!activePreview) return;
  
  isResizing = true;
  initialMouseX = e.clientX;
  initialMouseY = e.clientY;
  initialWidth = activePreview.offsetWidth;
  initialHeight = activePreview.offsetHeight;
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
}

// 处理大小调整移动事件
function handleResizeMove(e) {
  if (!isResizing || !activePreview) return;
  
  e.preventDefault();
  
  const deltaX = e.clientX - initialMouseX;
  const deltaY = e.clientY - initialMouseY;
  
  // 计算新尺寸，设置最小限制
  const newWidth = Math.max(600, initialWidth + deltaX);
  const newHeight = Math.max(600, initialHeight + deltaY);
  
  // 设置新尺寸
  activePreview.style.width = newWidth + 'px';
  activePreview.style.height = newHeight + 'px';
  
  // 调整内容区域的高度
  const body = activePreview.querySelector('.sol-token-preview-body');
  if (body) {
    const headerHeight = activePreview.querySelector('.sol-token-preview-header').offsetHeight;
    const tabsHeight = activePreview.querySelector('.sol-token-tabs').offsetHeight;
    const footerHeight = activePreview.querySelector('.sol-token-preview-footer').offsetHeight;
    
    const bodyHeight = newHeight - headerHeight - tabsHeight - footerHeight;
    body.style.height = bodyHeight + 'px';
    
    // 调整iframe的高度
    const activeTabContent = body.querySelector('.sol-token-tab-content.active');
    if (activeTabContent) {
      activeTabContent.style.height = bodyHeight + 'px';
      
      const iframe = activeTabContent.querySelector('.sol-token-preview-iframe');
      if (iframe) {
        iframe.style.height = bodyHeight + 'px';
      }
    }
  }
}

// 处理调整大小结束事件
function handleResizeEnd() {
  isResizing = false;
  document.removeEventListener('mousemove', handleResizeMove);
  document.removeEventListener('mouseup', handleResizeEnd);
}

// 显示预览窗口
function showPreview(token, mouseX, mouseY) {
  if (activePreview) {
    closePreview(true);
  }
  
  const preview = document.createElement('div');
  preview.className = 'sol-token-preview';
  preview.setAttribute('data-token', token);
  
  // 创建标题栏
  const header = document.createElement('div');
  header.className = 'sol-token-preview-header';
  
  const title = document.createElement('div');
  title.className = 'sol-token-preview-title';
  title.textContent = `Solana Token: ${token}`;
  
  header.appendChild(title);
  
  // 创建标签页
  const tabs = document.createElement('div');
  tabs.className = 'sol-token-tabs';
  
  const klineTab = document.createElement('div');
  klineTab.className = 'sol-token-tab active';
  klineTab.textContent = '价格走势';
  klineTab.setAttribute('data-tab', 'kline');
  
  const summaryTab = document.createElement('div');
  summaryTab.className = 'sol-token-tab';
  summaryTab.textContent = 'AI分析';
  summaryTab.setAttribute('data-tab', 'summary');
  
  tabs.appendChild(klineTab);
  tabs.appendChild(summaryTab);
  
  // 创建内容区域
  const body = document.createElement('div');
  body.className = 'sol-token-preview-body';
  
  // K线内容
  const klineContent = document.createElement('div');
  klineContent.className = 'sol-token-tab-content active';
  klineContent.setAttribute('data-content', 'kline');
  
  const iframe = document.createElement('iframe');
  iframe.className = 'sol-token-preview-iframe';
  iframe.src = `https://www.gmgn.cc/kline/sol/${token}`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  
  klineContent.appendChild(iframe);
  
  // AI分析内容
  const summaryContent = document.createElement('div');
  summaryContent.className = 'sol-token-tab-content';
  summaryContent.setAttribute('data-content', 'summary');
  
  // 加载状态
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'sol-token-loading';
  
  const spinner = document.createElement('div');
  spinner.className = 'sol-token-spinner';
  
  const loadingText = document.createElement('span');
  loadingText.textContent = '正在分析推文数据...';
  
  loadingDiv.appendChild(spinner);
  loadingDiv.appendChild(loadingText);
  
  summaryContent.appendChild(loadingDiv);
  
  body.appendChild(klineContent);
  body.appendChild(summaryContent);
  
  // 创建底部信息
  const footer = document.createElement('div');
  footer.className = 'sol-token-preview-footer';
  
  const footerContent = document.createElement('div');
  footerContent.className = 'sol-footer-buttons';

  const gmgnLink = document.createElement('a');
  gmgnLink.href = `https://gmgn.ai/sol/token/fGPQ3uoC_${token}`;
  gmgnLink.target = '_blank';
  gmgnLink.className = 'sol-footer-button';
  gmgnLink.textContent = '🐊GMGN';
  gmgnLink.title = '在GMGN查看代币';

  const XXYYLink = document.createElement('a');
  XXYYLink.href = `https://www.xxyy.io/api/data/alliance/misaka/${token}`;
  XXYYLink.target = '_blank';
  XXYYLink.className = 'sol-footer-button';
  XXYYLink.textContent = '🐦XXYY';
  XXYYLink.title = '在XXYY查看';

  const UniversalXLink = document.createElement('a');
  UniversalXLink.href = `https://universalx.app/trade?assetId=101_${token}&inviteCode=VSZRNQ`;
  UniversalXLink.target = '_blank';
  UniversalXLink.className = 'sol-footer-button';
  UniversalXLink.textContent = 'UniversalX';
  UniversalXLink.title = '在UniversalX查看';

  const BullXLink = document.createElement('a');
  BullXLink.href = `https://neo.bullx.io/terminal?chainId=1399811149&address=${token}&r=51LI0KE6NK8`;
  BullXLink.target = '_blank';
  BullXLink.className = 'sol-footer-button';
  BullXLink.textContent = '🐂BullX';
  BullXLink.title = '在BullX查看';

  footerContent.appendChild(gmgnLink);
  footerContent.appendChild(XXYYLink);
  footerContent.appendChild(UniversalXLink);
  footerContent.appendChild(BullXLink);

  footer.appendChild(footerContent);
  
  preview.appendChild(header);
  preview.appendChild(tabs);
  preview.appendChild(body);
  preview.appendChild(footer);
  
  // 添加调整大小的手柄
  addResizeHandle(preview);
  
  // 使标题栏可拖拽
  makeHeaderDraggable(header, preview);
  
  // 定位到鼠标初始位置右下角
  positionPreviewAtMouse(preview, mouseX, mouseY);
  
  // 添加鼠标事件，防止预览窗口关闭
  preview.addEventListener('mouseenter', () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  });
  
  preview.addEventListener('mouseleave', () => {
    closeTimer = setTimeout(() => {
      closePreview();
    }, CLOSE_DELAY);
  });
  
  // 防止点击预览窗口时的任何放大效果
  preview.addEventListener('click', (e) => {
    // 如果点击的是链接或标签页，允许默认行为
    if (e.target.tagName === 'A' || 
        e.target.classList.contains('sol-token-tab') ||
        e.target.closest('.sol-token-tab')) {
      return;
    }
    
    // 阻止其他点击事件可能导致的放大行为
    e.stopPropagation();
  });
  
  // 标签切换事件
  klineTab.addEventListener('click', () => switchTab('kline'));
  summaryTab.addEventListener('click', () => {
    switchTab('summary');
    // 首次切换时请求AI分析数据
    if (!summaryContent.querySelector('.sol-tweet-summary')) {
      loadTokenAnalysis(token, summaryContent);
    }
  });
  
  document.body.appendChild(preview);
  activePreview = preview;
  
  // 切换标签页函数
  function switchTab(tabName) {
    document.querySelectorAll('.sol-token-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.sol-token-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    const selectedTab = document.querySelector(`.sol-token-tab[data-tab="${tabName}"]`);
    const selectedContent = document.querySelector(`.sol-token-tab-content[data-content="${tabName}"]`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
  }
}

async function loadTokenAnalysis(token, container) {
  // 显示加载状态
  container.innerHTML = `
    <div class="sol-token-loading" id="analysisLoadingIndicator">
      <div class="sol-token-spinner"></div>
      <span>正在分析数据...</span>
    </div>
  `;

  console.log('准备发送分析请求:', token);

  try {
    // 使用 Promise 包装 chrome.runtime.sendMessage
    chrome.runtime.sendMessage(
      { action: "analyzeToken", token: token }
    );
    
    // 注意：不再等待响应，而是通过消息监听器处理结果
    // 这样加载动画会一直显示，直到收到结果
    
  } catch (error) {
    console.error('Token analysis error:', error);
    container.innerHTML = `
      <div class="sol-tweet-summary">
        <div class="sol-error-message">连接服务失败</div>
        <p class="sol-error-hint">请刷新页面后重试</p>
        <p class="sol-error-detail">${error.message}</p>
      </div>
    `;
  }
}

// 将渲染逻辑分离为独立函数
function renderAnalysisResult(container, tokenInfo, tweetSummary) {
  const summaryElement = document.createElement('div');
  summaryElement.className = 'sol-tweet-summary';

  // First check if tokenInfo exists
  if (!tokenInfo) {
    container.innerHTML = `
      <div class="sol-tweet-summary">
        <div class="sol-error-message">无法获取代币信息</div>
        <p class="sol-error-hint">请稍后重试或检查地址是否正确</p>
      </div>
    `;
    return;
  }

  // Market data section with null checks
  const marketInfo = `
    <div class="sol-token-market-info">
      <h4>市场数据</h4>
      <div class="sol-info-grid">
        ${tokenInfo.priceUSD ? `
          <div class="sol-info-item">
            <span class="sol-info-label">价格</span>
            <span class="sol-info-value">$${parseFloat(tokenInfo.priceUSD).toFixed(8)}</span>
          </div>
        ` : ''}
        ${tokenInfo.marketCap ? `
          <div class="sol-info-item">
            <span class="sol-info-label">市值</span>
            <span class="sol-info-value">$${formatNumber(tokenInfo.marketCap)}</span>
          </div>
        ` : ''}
        ${tokenInfo.liquidity ? `
          <div class="sol-info-item">
            <span class="sol-info-label">流动性</span>
            <span class="sol-info-value">$${formatNumber(tokenInfo.liquidity)}</span>
          </div>
        ` : ''}
        ${tokenInfo.volumeH24 ? `
          <div class="sol-info-item">
            <span class="sol-info-label">24h成交</span>
            <span class="sol-info-value">$${formatNumber(tokenInfo.volumeH24)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  // 推文分析部分
  let tweetAnalysis = '';
  
  if (tweetSummary) {
    if (tweetSummary.account_summary) {
      tweetAnalysis += `
        <div class="sol-analysis-section">
          <h4>官方动态分析</h4>
          <div class="sol-analysis-content">
            ${formatAnalysisText(tweetSummary.account_summary)}
          </div>
        </div>
      `;
    }

    if (tweetSummary.search_summary) {
      tweetAnalysis += `
        <div class="sol-analysis-section">
          <h4>市场情绪分析</h4>
          <div class="sol-analysis-content">
            ${formatAnalysisText(tweetSummary.search_summary)}
          </div>
        </div>
      `;
    }
  }

  summaryElement.innerHTML = marketInfo + tweetAnalysis;
  container.innerHTML = '';
  container.appendChild(summaryElement);
}

// 辅助函数：格式化数字显示
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

// 辅助函数：格式化分析文本
function formatAnalysisText(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('- ')) {
        return `<div class="sol-analysis-point">${line.substring(2)}</div>`;
      }
      return `<p>${line}</p>`;
    })
    .filter(line => line)
    .join('');
}

// 定位预览窗口
function positionPreviewAtMouse(preview, mouseX, mouseY) {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  const mousePageX = mouseX + scrollLeft;
  const mousePageY = mouseY + scrollTop;
  
  const previewWidth = Math.min(Math.max(window.innerWidth * 0.25, 320), 450);
  const previewHeight = Math.min(Math.max(window.innerHeight * 0.4, 300), 500);
  
  let top = mousePageY + 20;
  let left = mousePageX + 10;
  
  if (left + previewWidth > window.innerWidth + scrollLeft) {
    left = mousePageX - previewWidth - 10;
    
    if (left < scrollLeft) {
      left = Math.max(10, (window.innerWidth - previewWidth) / 2 + scrollLeft);
    }
  }
  
  if (top + previewHeight > window.innerHeight + scrollTop) {
    top = mousePageY - previewHeight - 10;
    
    if (top < scrollTop) {
      top = Math.max(scrollTop + 10, window.innerHeight + scrollTop - previewHeight - 10);
    }
  }
  
  preview.style.top = `${top}px`;
  preview.style.left = `${left}px`;
  preview.style.width = `${previewWidth}px`;
  preview.style.height = `${previewHeight}px`;
  
  // Also set initial height for the content body
  const body = preview.querySelector('.sol-token-preview-body');
  if (body) {
    const headerHeight = preview.querySelector('.sol-token-preview-header').offsetHeight;
    const tabsHeight = preview.querySelector('.sol-token-tabs').offsetHeight;
    const footerHeight = preview.querySelector('.sol-token-preview-footer').offsetHeight;
    
    const bodyHeight = previewHeight - headerHeight - tabsHeight - footerHeight;
    body.style.height = bodyHeight + 'px';
    
    // Set initial heights for tab contents and iframe
    const activeTabContent = body.querySelector('.sol-token-tab-content.active');
    if (activeTabContent) {
      activeTabContent.style.height = bodyHeight + 'px';
      
      const iframe = activeTabContent.querySelector('.sol-token-preview-iframe');
      if (iframe) {
        iframe.style.height = bodyHeight + 'px';
      }
    }
  }
}

// 关闭预览窗口
function closePreview(immediate = false) {
  if (!activePreview) return;
  
  if (immediate) {
    if (activePreview.parentNode) {
      activePreview.parentNode.removeChild(activePreview);
    }
    activePreview = null;
  } else {
    activePreview.style.opacity = '0';
    activePreview.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      if (activePreview && activePreview.parentNode) {
        activePreview.parentNode.removeChild(activePreview);
      }
      activePreview = null;
    }, 200);
  }
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
  scanForSolanaTokens();
  setInterval(scanForSolanaTokens, 3000);
});

// 在内容脚本中添加这段代码
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analysisResult") {
    // 找到显示结果的容器
    const activePreview = document.querySelector('.sol-token-preview');
    if (!activePreview) return;
    
    const container = activePreview.querySelector('.sol-token-tab-content[data-content="summary"]');
    if (container) {
      if (message.error) {
        container.innerHTML = `
          <div class="sol-tweet-summary">
            <div class="sol-error-message">分析出错</div>
            <p class="sol-error-hint">${message.error}</p>
          </div>
        `;
      } else {
        renderAnalysisResult(container, message.data.tokenInfo, message.data.tweetSummary);
      }
    }
  }
});