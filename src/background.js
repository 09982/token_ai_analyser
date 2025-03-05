const RAPID_API_KEY_STORAGE = 'rapidApiKey';
const OPENAI_API_KEY_STORAGE = 'openaiApiKey';

// 存储API密钥
let RAPID_API_KEY = '';
let OPENAI_API_KEY = '';

// DexScreener API 包装
const DexScreener = {
  async getTokenInfo(chain, address) {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/tokens/v1/${chain}/${address}`
      );
      const data = await response.json();
      
      if (!data || !data[0]) {
        throw new Error('No token data found');
      }
      
      return this.parseTokenInfo(data);
    } catch (error) {
      console.error('DexScreener API Error:', error);
      throw error;
    }
  },

  parseTokenInfo(data) {
    const pair = data[0];
    const baseToken = pair.baseToken;
    
    return {
      name: baseToken.name,
      symbol: baseToken.symbol,
      address: baseToken.address,
      chain: pair.chainId,
      liquidity: pair.liquidity?.usd,
      marketCap: pair.marketCap,
      priceUSD: pair.priceUsd,
      createdAt: Math.floor(pair.pairCreatedAt / 1000),
      volumeH24: pair.volume?.h24,
      volumeH6: pair.volume?.h6,
      volumeH1: pair.volume?.h1,
      volumeM5: pair.volume?.m5,
      changeH6: pair.priceChange?.h6,
      website: pair.info?.websites?.[0]?.url,
      twitter: pair.info?.socials?.find(s => s.type === 'twitter')?.url
    };
  }
};

// Twitter API 函数
async function searchTwitter(query) {
  if (!RAPID_API_KEY) {
    throw new Error('RapidAPI key not configured');
  }

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPID_API_KEY,
      'x-rapidapi-host': 'twitter-api45.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(
      `https://twitter-api45.p.rapidapi.com/search.php?query=${encodeURIComponent(query)}&search_type=Top`,
      options
    );
    
    const data = await response.json();
    if (!data?.timeline) return [];
    
    return data.timeline.map(tweet => ({
      text: tweet.text,
      created_at: new Date(tweet.created_at).toLocaleString('en-US', {hour12: false}) + ' UTC',
      views: tweet.views,
      favorites: tweet.favorites,
      author: {
        name: tweet.user_info.name,
        screen_name: tweet.user_info.screen_name,
        followers_count: tweet.user_info.followers_count
      }
    }));
  } catch (error) {
    console.error('Twitter search error:', error);
    return [];
  }
}

async function getUserTimeline(screenname) {
  if (!RAPID_API_KEY) {
    throw new Error('RapidAPI key not configured');
  }

  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': RAPID_API_KEY,
      'x-rapidapi-host': 'twitter-api45.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(
      `https://twitter-api45.p.rapidapi.com/timeline.php?screenname=${screenname}`,
      options
    );
    
    const data = await response.json();
    if (!data) return null;
    
    const result = {
      user: {
        name: data.user?.name,
        screen_name: screenname,
        verified: data.user?.blue_verified,
        followers_count: data.user?.sub_count
      },
      tweets: []
    };

    if (data.pinned) {
      result.tweets.push({
        text: data.pinned.text,
        created_at: new Date(data.pinned.created_at).toLocaleString('en-US', {hour12: false}) + ' UTC',
        views: data.pinned.views,
        favorites: data.pinned.favorites,
        isPinned: true
      });
    }

    if (data.timeline && Array.isArray(data.timeline)) {
      data.timeline.forEach(tweet => {
        result.tweets.push({
          text: tweet.text,
          created_at: new Date(tweet.created_at).toLocaleString('en-US', {hour12: false}) + ' UTC',
          views: tweet.views,
          favorites: tweet.favorites,
          isPinned: false
        });
      });
    }

    return result;
  } catch (error) {
    console.error('Twitter timeline error:', error);
    return null;
  }
}

// 初始化时加载API密钥
async function loadApiKeys() {
  try {
    const result = await chrome.storage.sync.get([RAPID_API_KEY_STORAGE, OPENAI_API_KEY_STORAGE]);
    RAPID_API_KEY = result[RAPID_API_KEY_STORAGE] || '';
    OPENAI_API_KEY = result[OPENAI_API_KEY_STORAGE] || '';
  } catch (error) {
    console.error('Failed to load API keys:', error);
  }
}

// 初始化
loadApiKeys();

// 生成推文摘要
async function genSum(symbol, tweets, type = 'search') {
  try {
    // 检查API密钥
    if (!OPENAI_API_KEY) {
      return "请先在扩展设置中配置OpenAI API密钥";
    }
    
    let tweetData = [];
    let promptPrefix = '';
    let promptSuffix = '';
    
    if (type === 'account') {
      promptPrefix = `请总结关于 ${symbol} 的账号推文:`;
      promptSuffix = `提供简短的要点总结。保持简洁直接,去除所有不必要的词语。`;
      
      tweetData = tweets.tweets.map((tweet, index) => `
Tweet ${index + 1}:
Content: ${tweet.text}
Time: ${tweet.created_at}
Engagement: ${tweet.views} views / ${tweet.favorites} likes 
---`);
    } else {
      promptPrefix = `请总结关于 ${symbol} 的搜索推文:`;
      promptSuffix = `提供关于叙事观点和风险内容的极简要点总结。不总结主观价格预测和个人收益的内容。保持简洁直接,去除所有不必要的词语。格式如下：
- 叙事观点：
- 风险内容：`;
      
      tweetData = tweets.map((tweet, index) => `
Tweet ${index + 1}:
Content: ${tweet.text}
Time: ${tweet.created_at}
Author: ${tweet.author.name} (@${tweet.author.screen_name})
Followers: ${tweet.author.followers_count}
Engagement: ${tweet.views} views / ${tweet.favorites} likes 
---`);
    }
    
    const prompt = `${promptPrefix}\n\n${tweetData.join('\n')}\n\n${promptSuffix}`;

    const response = await fetch('https://api.bianxie.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "system", content: "You are a helpful assistant that analyzes cryptocurrency Twitter data." },
          { role: "user", content: prompt }
        ],
        temperature: 1.0,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API错误');
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating Twitter summary:", error);
    return "生成摘要时出错: " + error.message;
  }
}

// 总结推文函数 - 修改使用RAPID_API_KEY
async function sumTweets(tokenInfo) {
  // 检查API密钥
  if (!RAPID_API_KEY) {
    return { error: "请先在扩展设置中配置RapidAPI密钥" };
  }
  
  const { symbol, address, twitter } = tokenInfo;
  
  let account_tweets = [];
  let search_tweets = [];
  
  // 获取Twitter账号推文
  if (twitter && (twitter.includes('x.com/') || twitter.includes('twitter.com/'))) {
    const urlParts = twitter.split('/');
    if (!twitter.includes('/communities/') && !twitter.includes('/search?') && !twitter.includes('/status/')) {
      let screenname = urlParts[urlParts.length - 1].split('?')[0];
      
      const timelineResult = await getUserTimeline(screenname);
      if (timelineResult) account_tweets = timelineResult;
    }
  }
  
  // 搜索与代币地址相关的推文
  search_tweets = await searchTwitter(address);
  
  if (!search_tweets?.length) {
    return { error: `没有找到关于 ${symbol}(${address}) 的推文数据。` };
  }
  
  // 分析推文
  const search_summary = await genSum(symbol, search_tweets, 'search');
  
  let account_summary = "";
  if (account_tweets?.tweets?.length > 0) {
    account_summary = await genSum(symbol, account_tweets, 'account');
  }
  
  return { search_summary, account_summary };
}

// 分析代币函数
async function analyzeToken(address) {
  try {
    // Check API keys
    if (!RAPID_API_KEY || !OPENAI_API_KEY) {
      return { error: "请先在扩展设置中配置API密钥" };
    }
    
    // Get token info with proper error handling
    let tokenInfo;
    try {
      console.log(address)
      tokenInfo = await DexScreener.getTokenInfo('solana', address);
      if (!tokenInfo) {
        return { error: "无法获取代币信息" };
      }
    } catch (error) {
      console.error('DexScreener API error:', error);
      return { error: "获取代币信息失败: " + error.message };
    }
    
    // Get tweet analysis
    let tweetSummary;
    try {
      tweetSummary = await sumTweets(tokenInfo);
    } catch (error) {
      console.error('Tweet analysis error:', error);
      // Continue with tokenInfo even if tweet analysis fails
      tweetSummary = { error: "推文分析失败，但代币信息可用" };
    }
    
    return {
      tokenInfo,
      tweetSummary
    };
  } catch (error) {
    console.error('Error analyzing token:', error);
    return { error: error.message };
  }
}

// 消息监听处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiKeysUpdated') {
    RAPID_API_KEY = request.keys.rapidApiKey;
    OPENAI_API_KEY = request.keys.openaiApiKey;
    sendResponse({success: true});
  }
  else if (request.action === "analyzeToken") {
    // 立即返回一个状态
    sendResponse({status: 'processing'});
    
    // 开始异步分析
    analyzeToken(request.token)
      .then(result => {
        // 使用tabs API发送结果回content script
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "analysisResult",
            data: result
          });
        }
      })
      .catch(error => {
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "analysisResult",
            error: error.message
          });
        }
      });
  }
  return true; // 保持消息通道开放
});

// 添加安装/更新事件监听
chrome.runtime.onInstalled.addListener(loadApiKeys);