// 页面加载时从存储获取API密钥
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get(['rapidApiKey', 'openaiApiKey'], function(result) {
      if (result.rapidApiKey) {
        document.getElementById('rapidapi-key').value = result.rapidApiKey;
      }
      if (result.openaiApiKey) {
        document.getElementById('openai-key').value = result.openaiApiKey;
      }
    });
    
    // 保存按钮点击事件
    document.getElementById('save-button').addEventListener('click', saveSettings);
    
    // 密钥显示/隐藏切换
    document.querySelectorAll('.toggle-visibility').forEach(button => {
      button.addEventListener('click', function() {
        const inputId = this.getAttribute('data-for');
        const input = document.getElementById(inputId);
        
        if (input.type === 'password') {
          input.type = 'text';
          this.textContent = '🔒';
        } else {
          input.type = 'password';
          this.textContent = '👁️';
        }
      });
    });
  });
  
  // 保存设置到Chrome存储
  function saveSettings() {
    const rapidApiKey = document.getElementById('rapidapi-key').value.trim();
    const openaiApiKey = document.getElementById('openai-key').value.trim();
    const statusElement = document.getElementById('status-message');
    
    // 简单验证
    if (!rapidApiKey || !openaiApiKey) {
      showStatus('请填写所有API密钥', 'error');
      return;
    }
    
    // 保存到Chrome存储
    chrome.storage.sync.set(
      { 
        rapidApiKey: rapidApiKey,
        openaiApiKey: openaiApiKey
      }, 
      function() {
        showStatus('设置已保存', 'success');
        
        // 通知后台脚本API密钥已更新
        chrome.runtime.sendMessage({
          action: 'apiKeysUpdated',
          keys: { rapidApiKey, openaiApiKey }
        });
      }
    );
  }
  
  // 显示状态消息
  function showStatus(message, type) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    // 3秒后自动隐藏消息
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }