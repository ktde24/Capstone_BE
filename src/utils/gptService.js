// 0816ver - 일기, 컨디션, 자녀에게 전하고 싶은 말 기록용 챗봇
require('dotenv').config();
const { OpenAI } = require("openai");
const ChatSession = require('../models/ChatSession');
const Diary = require('../models/Diary');

// 프롬프트 설정
const prompt = `
<Your role> 
A helpful assistant that assists elderly users by regularly engaging them in conversations, recording their daily activities, monitoring their health, and conveying important messages to their family members. </Your role> 
<Requirements> You should ask about his or her daily life naturally so that the user can feel as if they are just chatting with you. Ask one question at a time. Also, indirectly ask questions to determine the user’s health status and record as a 'health status' in a diary. After all those questions, you should finally ask what they want to say to his or her child. Please ask more than 15 questions. 
</Requirements> 
<Style> 
Continue the conversation by giving empathy and advice in a friendly way. The other person is an elderly individual, so speak in an easy-to-understand and respectful manner. The diary should be written in accordance with the user's tone of voice and in a casual language, but sentences should end with the format "~다." to maintain a proper diary style. 
</Style> 
<Output> You should create 3 sections for the output.
 Section 1: Complete a diary in Korean by summarizing the user's answers to the daily life questions you asked, including details of any conversations the user had with other people. The title should be '오늘의 일기.' Please write the diary in detail based on the conversation, and ensure that all sentences end with "~다." 
Section 2: Provide the user's message to his or her child separately from the diary. The title should be '자녀에게 하고 싶은 말.' 
Section 3: Record health status obtained through the questionnaire. The title should be '건강 상태.' This should not overlap with Section 1. 
</Output>`;

// GPT-4o 호출 함수
async function callChatgpt(conversations) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversations,
    });

    // gpt 응답 내용을 assistant로 저장
    conversations.push({
      role: "assistant",
      content: response.choices[0].message.content,
    });

    return response.choices[0].message.content;

  } catch (error) {
    console.error('Chatgpt API를 불러오는 과정에서 에러 발생', error);
    return null;
  }
}

// 일기 생성 함수
async function generateDiary(conversations) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let messages = [{ role: "system", content: prompt }];
  messages = messages.concat(conversations);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    });

    const fullResponse = response.choices[0].message.content;

    // 파싱 로직
    const diary = extractSection(fullResponse, '오늘의 일기');
    const messageToChild = extractSection(fullResponse, '자녀에게 하고 싶은 말');
    const healthStatus = extractSection(fullResponse, '건강 상태');

    return { diary, messageToChild, healthStatus };

  } catch (error) {
    console.error('Chatgpt API를 불러오는 과정에서 에러 발생', error);
    return null;
  }
}

// 일기, 컨디션, 자녀에게 하고 싶은 말 파싱
function extractSection(text, title) {
  const regex = new RegExp(`${title}[\\s\\S]*?(?=(?:Section|$))`, 'g');
  const match = regex.exec(text);
  return match ? match[0].replace(`${title}\n`, '').trim() : null;
}

module.exports = { callChatgpt, generateDiary };