import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client server-side
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Helper function to try generateContent with fallback models
const generateWithFallback = async (ai: GoogleGenAI, contents: any, config?: any) => {
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];
  let lastErr: any = null;

  for (const m of modelsToTry) {
    try {
      const reqOptions: any = { model: m, contents };
      if (config) reqOptions.config = config;
      const res = await ai.models.generateContent(reqOptions);
      if (res && res.text) {
        return res;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`Model ${m} encountered ${err?.status || 'issue'}, switching to fallback model...`);
    }
  }
  throw lastErr || new Error('All Gemini model attempts completed');
};

// 1. Gemini AI Order Optimizer API Route
app.post('/api/gemini/optimize-order', async (req, res) => {
  try {
    const { roughTitle, category, description } = req.body;
    const ai = getAiClient();

    if (!ai) {
      // Clean fallback if API key is not present
      const cleanTitle = roughTitle ? roughTitle.trim() : 'Digital Service';
      return res.json({
        optimizedTitle: `I will ${cleanTitle} for Order Boss Marketplace`,
        optimizedDesc: `অর্ডার বস প্ল্যাটফর্মে এই সার্ভিসটি অর্ডার করুন! ${description || 'উচ্চমানের সার্ভিস ও ২৪ ঘণ্টার মধ্যে এক্সপ্রেস ডেলিভারি।'}\n\n🌟 কেন এই সার্ভিস অর্ডার করবেন:\n- ১০০% স্যাটিস্ফেকশন গ্যারান্টি\n- দ্রুত রিভিশন ও প্রফেশনাল ফাইল\n- ২৫/৭ কাস্টমার সাপোর্ট`,
        tags: [category || 'Programming', 'Order Boss', 'Top Rated', 'Expert Service', 'Fast Delivery'],
      });
    }

    const prompt = `You are Order Boss AI Assistant (অর্ডার বস এআই সহকারী). 
A freelancer wants to publish an order (service) on Order Boss marketplace.
Title provided: "${roughTitle || ''}"
Category: "${category || 'Programming & Tech'}"
Description/Notes provided: "${description || ''}"

Generate an expert, high-converting SEO optimized title, description, and tags.
Return ONLY a raw valid JSON object without markdown formatting:
{
  "optimizedTitle": "Catchy SEO title in English or mixed English/Bangla starting with 'I will...' or 'আমি...' (max 80 chars)",
  "optimizedDesc": "Engaging detailed description in Bangla & English with bullet points, why choose us, and deliverables.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    const response = await generateWithFallback(ai, prompt, {
      responseMimeType: 'application/json',
    });

    const textOutput = response.text || '{}';
    const parsed = JSON.parse(textOutput);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Optimization error:', err);
    return res.json({
      optimizedTitle: `I will provide professional ${req.body.roughTitle || 'custom service'} on Order Boss`,
      optimizedDesc: `অর্ডার বস মার্কেটপ্লেসে পেশাদার ডেলিভারি সার্ভিস।\n- দ্রুত ডেলিভারি\n- ১০০% সন্তুষ্টি\n- লাইফটাইম সাপোর্ট`,
      tags: ['Order Boss', 'Freelance Pro', 'Top Service', 'Fast Delivery', 'Expert Work'],
    });
  }
});

// 2. Gemini AI General Assistant Chatbot API Route
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history, currentTab } = req.body;
    const ai = getAiClient();

    // Default smart suggestions engine based on genuine user intent
    const generateSmartSuggestions = (userText: string, aiText: string) => {
      const lower = (userText + ' ' + aiText).toLowerCase();
      if (lower.includes('কোর্স') && (lower.includes('লিস্ট') || lower.includes('ফি') || lower.includes('ভর্তি') || lower.includes('এনরোল'))) {
        return ['কোর্স সিলেবাস ও লাইভ ক্লাস মডিউল 📚', 'মেন্টর ও ট্রেইনারদের প্রোফাইল 👨‍🏫', 'সার্টিফিকেট ও জব প্লেসমেন্ট সাপোর্ট 🎓'];
      }
      if (lower.includes('ওয়েব') || lower.includes('প্রোগ্রামিং') || lower.includes('কোডিং') || lower.includes('developer') || lower.includes('শিখ')) {
        return ['ফুল-স্ট্যাক লার্নিং রোডম্যাপ ২০২৬ 🚀', 'ফ্রন্টএন্ড বনাম ব্যাকএন্ড ক্যারিয়ার গাইড 💡', 'প্রজেক্ট আইডিয়া ও পোর্টফোলিও টিপস 🛠️'];
      }
      if (lower.includes('মার্কেটপ্লেস') || lower.includes('ফ্রিল্যান্স') || lower.includes('কাজ') || lower.includes('ইনকাম')) {
        return ['প্রথম ফ্রিল্যান্স অর্ডার পাওয়ার কৌশল 💼', 'ক্লায়েন্ট প্রপোজাল লেখার নিয়ম ✍️', 'কমিউনিকেশন ও পোর্টফোলিও সেটআপ 🌟'];
      }
      if (lower.includes('সার্ভিস') || lower.includes('বিজনেস') || lower.includes('ব্যবসা') || lower.includes('ওয়েবসাইট তৈরি')) {
        return ['ব্যবসার জন্য আধুনিক ওয়েবসাইট তৈরি 🌐', 'ডিজিটাল মার্কেটিং ও লিড জেনারেশন 📈', 'আইটি সমাধান ও বাজেট পরামর্শ 💡'];
      }
      return ['ক্যারিয়ার পরামর্শ ও গাইডলাইন 🎯', 'প্রোগ্রামিং বা টেকনিক্যাল প্রশ্ন 💻', 'সরাসরি সাপোর্ট প্রতিনিধির সাহায্য 🎧'];
    };

    if (!ai) {
      const defaultReply = `আসসালামু আলাইকুম! আমি আপনার স্মার্ট এআই সহকারী ✨\n\nওয়েব ডেভেলপমেন্ট, প্রোগ্রামিং রোডম্যাপ, ক্যারিয়ার গাইডলাইন, প্রযুক্তিগত সমস্যা সমাধান কিংবা ব্যবসা বৃদ্ধি সংক্রান্ত যেকোনো প্রশ্নের সঠিক পরামর্শ দিতে আমি প্রস্তুত। আপনার প্রশ্নটি লিখুন!`;
      return res.json({
        reply: defaultReply,
        suggestions: generateSmartSuggestions(message, defaultReply),
      });
    }

    const systemInstruction = `You are an intelligent, highly skilled, and professional AI Tech Consultant, Mentor & Assistant for the PTENit & Order Boss ecosystem.

CORE DIRECTIVE - RESPECT USER INTENT (CRITICAL):
1. ACCURATE ADVICE FIRST: When the user asks for advice, guidance, programming concepts, career roadmaps, bug fixing, learning paths, business strategies, or general tech questions:
   - Provide direct, thoughtful, accurate, structured, and actionable expert answers immediately.
   - Explain concepts clearly with practical steps, best practices, and logical advice.
2. ABSOLUTELY NO UNSOLICITED COURSE PROMOTION:
   - DO NOT automatically pitch, advertise, or force PTENit courses, fees, or institute admissions when the user is asking for general advice, tutorial help, learning tips, coding help, or suggestions.
   - ONLY discuss specific PTENit training courses if the user explicitly asks about available courses, training fees, or admission details at PTENit.
3. ABSOLUTELY NO UNSOLICITED SERVICE SELLING:
   - Provide helpful technical answers instead of blindly selling agency services, unless the user specifically asks to hire PTENit for a project.

STYLE & FORMATTING:
- Write in natural, polite, crystal clear Bengali (or English if the user writes in English).
- Tone: Helpful, knowledgeable, respectful, encouraging, and highly competent.
- STRICTLY DO NOT USE ASTERISKS FOR BOLDING (**text** or *text*). Always output clean, elegant plain text.
- Do not spam emojis. Keep the formatting clean with simple bullet points (• or -) where helpful.
- End your response with a line starting with "SUGGESTIONS:" followed by exactly 3 short, relevant options separated by "|". Example:
SUGGESTIONS: লার্নিং রোডম্যাপ|প্র্যাকটিস প্রজেক্ট আইডিয়া|অন্যান্য পরামর্শ`;

    const recentHistory = (history || []).slice(-6).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

    const chatContents = [
      ...recentHistory,
      { role: 'user', parts: [{ text: message }] },
    ];

    let response: any = null;
    try {
      response = await generateWithFallback(ai, chatContents, {
        systemInstruction,
        maxOutputTokens: 800,
        temperature: 0.7,
      });
    } catch (apiErr: any) {
      console.warn('Gemini API call failed, using intelligent domain fallback engine:', apiErr?.message || apiErr);
      // Smart domain fallback when API quota is exhausted
      const lower = message.toLowerCase();
      let fallbackReply = `ধন্যবাদ আপনার প্রশ্নের জন্য! আমি আপনার পরামর্শ ও টেকনিক্যাল বিষয়ে সাহায্য করতে প্রস্তুত। আপনার সুনির্দিষ্ট লক্ষ্য বা সমস্যাটি বিস্তারিত জানালে আমি ধাপে ধাপে দিকনির্দেশনা প্রদান করতে পারব।`;

      if (lower.includes('ওয়েব') || lower.includes('শিখ') || lower.includes('প্রোগ্রামিং') || lower.includes('কোডিং') || lower.includes('শুরু')) {
        fallbackReply = `ওয়েব ডেভেলপমেন্ট শেখার কার্যকরী গাইডলাইন:\n\n১. বেসিক ফান্ডামেন্টাল: প্রথমে HTML5, CSS3 ও রেসপনসিভ ডিজাইন (Flexbox/Grid/Tailwind) ভালো করে আয়ত্ত করুন।\n২. প্রোগ্রামিং লজিক: JavaScript (ES6+, DOM, Fetch API, Async/Await) দিয়ে ছোট ছোট ইন্টারেক্টিভ প্রজেক্ট তৈরি করুন।\n৩. ফ্রন্টএন্ড ফ্রেমওয়ার্ক: React.js বা Next.js শিখে কম্পোনেন্ট-বেসড আর্কিটেকচার আয়ত্ত করুন।\n৪. ব্যাকএন্ড ও ডেটাবেস: Node.js/Express এবং MongoDB বা PostgreSQL শিখুন।\n৫. নিয়মিত প্র্যাকটিস: প্রতিদিন কোড লিখুন এবং গিটহাবে প্রজেক্ট পুশ করে বাস্তব পোর্টফোলিও তৈরি করুন।`;
      } else if (lower.includes('ফ্রিল্যান্স') || lower.includes('ইনকাম') || lower.includes('মার্কেটপ্লেস') || lower.includes('কাজ')) {
        fallbackReply = `ফ্রিল্যান্সিং শুরু করার বাস্তবসম্মত পরামর্শ:\n\n১. যেকোনো একটি সুনির্দিষ্ট স্কিল বাছাই করুন (যেমন: ফ্রন্টএন্ড ডেভেলপমেন্ট, ওয়ার্ডপ্রেস বা ইউআই/ইউএক্স ডিজাইন)।\n২. ক্লায়েন্টকে দেখানোর মতো ৩-৫টি পূর্ণাঙ্গ ও লাইভ প্রজেক্টের পোর্টফোলিও তৈরি করুন।\n৩. বায়ার রিকোয়ারমেন্ট নিখুঁতভাবে বুঝে পারসোনালাইজড প্রপোজাল লেখার অভ্যাস করুন।\n৪. মার্কেটপ্লেসে ভালো রিভিউ বজায় রাখতে সময়মতো ডেলিভারি ও চমৎকার কমিউনিকেশন দিন।`;
      } else if (lower.includes('ব্যবসা') || lower.includes('বিজনেস') || lower.includes('সেল') || lower.includes('মার্কেটিং')) {
        fallbackReply = `অনলাইন ব্যবসা ও লিড বৃদ্ধির কার্যকর কৌশল:\n\n১. টার্গেটেড অডিয়েন্স রিসার্চ: আপনার পণ্য বা সার্ভিসের প্রকৃত ক্রেতা কারা তা নির্ধারণ করুন।\n২. নির্ভরযোগ্য ডিজিটাল প্রেজেন্স: প্রফেশনাল ও ফাস্ট-লোডিং ওয়েবসাইট রাখুন যা মোবাইল বান্ধব।\n৩. ভ্যালু-ভিত্তিক কনটেন্ট: সোশ্যাল মিডিয়ায় গ্রাহকের সমস্যার সমাধানমূলক কনটেন্ট ও কাস্টমার রিভিউ প্রকাশ করুন।\n৪. কনভার্সন ট্র্যাকিং: ফেসবুক পিক্সেল ও গুগল অ্যানালিটিক্স দিয়ে ক্যাম্পেইন অপ্টিমাইজ করুন।`;
      }

      return res.json({
        reply: fallbackReply,
        suggestions: generateSmartSuggestions(message, fallbackReply),
      });
    }

    let rawText = response.text || 'ধন্যবাদ! PTENit ও Order Boss এআই সহকারী সাহায্য করতে প্রস্তুত।';
    let suggestions: string[] = [];

    if (rawText.includes('SUGGESTIONS:')) {
      const parts = rawText.split('SUGGESTIONS:');
      rawText = parts[0].trim();
      const suggStr = parts[1].trim();
      suggestions = suggStr.split('|').map(s => s.trim()).filter(Boolean).slice(0, 3);
    }

    // Clean any residual markdown bold asterisks
    rawText = rawText.replace(/\*\*/g, '');

    if (suggestions.length === 0) {
      suggestions = generateSmartSuggestions(message, rawText);
    }

    return res.json({
      reply: rawText,
      suggestions: suggestions,
    });
  } catch (err: any) {
    console.error('Gemini Chat error:', err);
    return res.json({
      reply: 'PTENit ও Order Boss এআই সহকারী সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
      suggestions: ['লাইভ সাপোর্ট টিমের সাথে কথা বলুন 🎧', 'এডমিন প্যানেলে প্রবেশ করুন 🛡️', 'ওয়েবসাইটে ফিরে যান 🏠'],
    });
  }
});

// 3. Super AI Copilot & Universal Action Engine API Route
app.post('/api/gemini/copilot-action', async (req, res) => {
  try {
    const { query, history, currentTab } = req.body;
    const ai = getAiClient();
    const cleanQuery = (query || '').trim();

    if (!cleanQuery) {
      return res.json({
        reply: 'আমি আপনার সার্বিক সহায়তায় প্রস্তুত। কোর্স, সার্ভিস, ফ্রি ক্লাস, ফ্রিল্যান্সিং বা যেকোনো প্রশ্ন লিখুন!',
        actionType: 'general',
        suggestions: ['১০০% ফ্রি কোর্সসমূহ 🎓', 'ওয়েব ডেভেলপমেন্ট কোর্স 💻', 'ডিজিটাল মার্কেটিং সার্ভিস 📈', 'সাপোর্টে কথা বলুন 🎧'],
      });
    }

    if (!ai) {
      // Deterministic Domain fallback
      const lower = cleanQuery.toLowerCase();
      let actionType = 'general';
      let reply = 'আমি আপনার সহায়তায় প্রস্তুত। নিচের অপশনগুলো থেকে আপনার প্রয়োজনীয় সার্ভিস বা কোর্স নির্বাচন করুন:';
      let suggestions = ['ফ্রি কোর্সসমূহ দেখুন 🎓', 'সার্ভিস প্যাকেজ 💼', 'মার্কেটপ্লেস গিগ ⚡', 'হেল্পলাইন সাপোর্ট 🎧'];

      if (lower.includes('ফ্রি') || lower.includes('free') || lower.includes('বিনামূল্যে') || lower.includes('টাকা ছাড়া')) {
        actionType = 'free_courses';
        reply = 'আপনার জন্য প্ল্যাটফর্মের ১০০% ফ্রি ও ওপেন কোর্সসমূহ নিচে নিয়ে আসা হয়েছে! আপনি সরাসরি ১-ক্লিক করেই এনরোল করে এখনই ক্লাস শুরু করতে পারবেন:';
        suggestions = ['ফেসবুক মার্কেটিং ফ্রি কোর্স 📱', 'ক্যানভা ডিজাইন ফ্রি ক্র্যাশ কোর্স 🎨', 'ওয়েব ডেভেলপমেন্ট স্টার্টার 🚀'];
      } else if (lower.includes('কোর্স') || lower.includes('শিখ') || lower.includes('admission') || lower.includes('ভর্তি')) {
        actionType = 'courses';
        reply = 'আপনার পছন্দের সেরা কোর্সসমূহ নিচে সাজিয়ে দেওয়া হলো:';
        suggestions = ['ওয়েব ডেভেলপমেন্ট 💻', 'ইউটিউব এসইও 🔍', 'ওয়ার্ডপ্রেস ও ই-কমার্স 🌐'];
      } else if (lower.includes('সার্ভিস') || lower.includes('বানা') || lower.includes('তৈরি') || lower.includes('service')) {
        actionType = 'services';
        reply = 'PTENit এজেন্সির প্রফেশনাল আইটি সার্ভিসেস ও প্যাকেজসমূহ নিচে দেওয়া হলো:';
        suggestions = ['ওয়েবসাইট তৈরি 🌐', 'ডিজিটাল মার্কেটিং 📈', 'এসইও র‍্যাংকিং 🔍'];
      } else if (lower.includes('গিগ') || lower.includes('ফ্রিল্যান্স') || lower.includes('gig') || lower.includes('specialist')) {
        actionType = 'gigs';
        reply = 'মার্কেটপ্লেসের টপ রেটেড স্পেশালিস্টদের জনপ্রিয় গিগগুলো নিচে দেখুন:';
        suggestions = ['লোগো ডিজাইন গিগ 🎨', 'ফুল-স্ট্যাক ওয়েব গিগ 💻', 'ভিডিও এডিটিং গিগ 🎬'];
      } else if (lower.includes('লগইন') || lower.includes('অ্যাকাউন্ট') || lower.includes('সাইন আপ') || lower.includes('login')) {
        actionType = 'auth';
        reply = 'আপনার একাউন্টে প্রবেশ করতে অথবা নতুন অ্যাকাউন্ট তৈরি করতে নিচের বাটনে চাপ দিন:';
        suggestions = ['লগইন উইন্ডো খুলুন 🔐', 'ডেমো স্টুডেন্ট লগইন 🎓', 'ডেমো এডমিন লগইন 🛡️'];
      } else if (lower.includes('পেমেন্ট') || lower.includes('বিকাশ') || lower.includes('নগদ') || lower.includes('নম্বর') || lower.includes('payment')) {
        actionType = 'payment';
        reply = 'PTENit ও Order Boss অফিসিয়াল পেমেন্ট মেথড ও মার্চেন্ট নম্বর:\n• বিকাশ (Personal): 01700-000000\n• নগদ (Personal): 01800-000000\n• রকেট: 01900-000000\n• ব্যাংক: DBBL / City Bank\n\nপেমেন্ট সম্পন্ন করে TrxID দিয়ে যেকোনো কোর্স বা সার্ভিস কনফার্ম করতে পারবেন।';
        suggestions = ['পেমেন্ট নম্বর কপি করুন 📋', 'কোর্সে ভর্তি হন 🎓', 'সাপোর্টে কথা বলুন 🎧'];
      }

      return res.json({
        reply,
        actionType,
        suggestions,
      });
    }

    const systemPrompt = `You are PTENit & Order Boss Super AI Copilot (সুপার এআই সহকারী ও অ্যাকশন হাব).
The user is asking a question or requesting an action on the PTENit platform.

YOUR RESPONSIBILITY:
Understand the user's intent and return a clean JSON response with:
1. "reply": A friendly, helpful, short response in clear Bengali (or English if prompted in English). NO ASTERISKS (**text**).
2. "actionType": One of:
   - "free_courses": When user asks for free courses, gratis learning, "ফ্রি কোর্স", "বিনামূল্যে শিখব", etc.
   - "courses": When user asks for specific courses, training, learning roadmap, etc.
   - "services": When user wants to hire IT services, agency website design, marketing, SEO, etc.
   - "gigs": When user asks for marketplace freelance gigs, top specialists, etc.
   - "digital_products": When user asks for software, scripts, templates, etc.
   - "auth": When user asks to login, register, sign up, or switch accounts.
   - "payment": When user asks for bKash/Nagad payment numbers, fees, methods.
   - "support": When user asks for helpline, WhatsApp, live chat, or talk to mentor.
   - "general": For coding help, explanations, general questions.
3. "categoryFilter": optional string if query mentions a specific category (e.g. 'Development', 'Design', 'Marketing', 'SEO').
4. "suggestions": array of 3-4 short Bengali chips.

Example user query: "আমাকে ফ্রি কোর্স দাও"
Response:
{
  "reply": "আপনার জন্য প্ল্যাটফর্মের ১০০% ফ্রি কোর্সসমূহ নিচে নিয়ে আসা হয়েছে! সরাসরি ১-ক্লিকেই ক্লাসে যুক্ত হতে পারবেন:",
  "actionType": "free_courses",
  "categoryFilter": "",
  "suggestions": ["ফেসবুক মার্কেটিং ফ্রি কোর্স", "ক্যানভা ডিজাইন ফ্রি ক্র্যাশ কোর্স", "ওয়েব স্টার্টার কোর্স"]
}`;

    const response = await generateWithFallback(ai, cleanQuery, {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.6,
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.reply) {
      parsed.reply = parsed.reply.replace(/\*\*/g, '');
    }
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Copilot Action error:', err);
    return res.json({
      reply: 'আমি আপনার সহায়তায় প্রস্তুত। নিচে থেকে আপনার প্রয়োজনীয় অপশন নির্বাচন করুন:',
      actionType: 'general',
      suggestions: ['১০০% ফ্রি কোর্স 🎓', 'ওয়েব ডেভেলপমেন্ট 💻', 'মার্কেটপ্লেস গিগ ⚡', 'সাপোর্ট 🎧'],
    });
  }
});

// 2. 1-Click External Portfolio Importer API Route
app.post('/api/portfolio/import', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Portfolio URL is required' });
    }

    let platform = 'Portfolio Website';
    if (url.includes('behance.net')) platform = 'Behance';
    else if (url.includes('github.com')) platform = 'GitHub';
    else if (url.includes('linkedin.com')) platform = 'LinkedIn';
    else if (url.includes('dribbble.com')) platform = 'Dribbble';

    // Simulated parsing of public profile data
    return res.json({
      success: true,
      platform,
      extractedName: 'Verified Order Boss Freelancer',
      extractedTitle: `Senior Designer & Full-Stack Pro (${platform} Verified)`,
      extractedBio: `Professional creator imported directly from ${platform}. Over 50+ successful projects completed with exceptional quality and 5-star client ratings. Dedicated to delivering top-tier work on Order Boss.`,
      extractedSkills: ['React & Next.js', 'UI/UX Design', 'TypeScript', 'Node.js Backend', 'Tailwind CSS', 'AI Agent Integration'],
      extractedGalleries: [
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to parse portfolio URL' });
  }
});

// Vite middleware or production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Order Boss server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
