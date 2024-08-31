// 0826ver - 기억력 점수 측정용 챗봇
require('dotenv').config();
const { OpenAI } = require("openai");

// 기억점수 프롬프트 생성 함수
async function createScorePrompt(userInfo, diaryList) {
  let score_prompt = `
당신은 사용자의 일기를 바탕으로 '기억 점수'를 측정하는 챗봇입니다. 질문은 반드시 하나씩만 제공하고, 사용자의 응답을 받은 후에만 다음 질문을 제공해야 합니다. 질문은 구체적이어야 하며, 동일하거나 비슷한 질문은 반복하지 않습니다. 사용자가 질문에 답하지 못하거나 틀린 답을 했을 때만 힌트를 하나씩 제공합니다. 

질문 예시:
- 어제 집에서 주로 시간을 보냈다고 하셨는데, 무엇을 하셨나요?
  - (힌트 1) 어제는 TV를 보셨다고 하셨어요. 어떤 프로그램이 인상 깊었나요?
  - (힌트 2) 그 프로그램에서 어떤 가수가 기억에 남았나요?
  - (힌트 3) 성에 '이'자가 들어가는 가수였는데, 누굴까요?

<Requirements>
1. 각 질문은 반드시 한 번에 하나씩만 제공하세요.
2. 사용자의 응답을 받은 후에만 다음 질문을 제공하세요.
3. 동일하거나 비슷한 질문을 반복하지 마세요.
4. 사용자가 질문에 제대로 답변하지 못했을 때만 힌트를 하나씩 제공합니다.
5. 3일 전, 2일 전, 1일 전의 일기 내용을 바탕으로 순서대로 질문을 생성하세요.
6. 질문1: 3일 전의 일기를 바탕으로 최근 발생한 일을 기억하는지 묻는 질문.
7. 질문2: 2일 전의 일기를 바탕으로 기억을 묻는 질문.
8. 질문3: 1일 전의 일기를 바탕으로 기억을 묻는 질문.
9. 질문4: 최근 3일간의 일기에서 대화 관련 내용을 상기시키는 질문 (대화가 없을 경우 생략).
10. 질문5: 충분한 응답이 없거나 오답률이 20% 초과일 경우 추가 질문.

정답 여부는 사용자에게 밝히지 않으며, 마지막에 점수를 측정해 결과를 제공합니다. 사용자가 일기와 정확하게 일치하지 않더라도, 유사한 내용을 기억하고 있다면 정답으로 인정합니다. 질문 1~4에서 오답률이 20%를 초과하면 추가 질문을 합니다.

<출력>
각 질문에 대한 응답을 받은 후에만 다음 질문을 제공하세요. 결과는 전체 질문 개수, 사용된 힌트 개수, 정답 개수, CDR 기억점수로 구분해 출력하세요.

<사용자 정보>
보호자 주소: ${userInfo.address}, 보호자 생일: ${userInfo.birth}, 보호자 직업: ${userInfo.job}, 사용자 이름: ${userInfo.elderlyName}

<일기 내용>`;

  diaryList.forEach(diary => {
    score_prompt += `\n- 일기 날짜: ${diary.date}, 일기 내용: ${diary.content}`;
  });

  return score_prompt;
}

// 기억 테스트 함수
async function memoryTest(userInfo, diaryList, conversations) {
  const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 타임아웃 설정
  });

  const score_prompt = await createScorePrompt(userInfo, diaryList);

  let messages = [{ role: "system", content: score_prompt }];
  messages = messages.concat(conversations);

  try {
      const response = await openai.chat.completions.create({
          model: "gpt-4o", 
          messages: messages,
          temperature: 0.7,  // Playground 기본값
          max_tokens: 256,  // 필요에 따라 조정
          top_p: 1.0,  // Playground 기본값
          frequency_penalty: 0,  // Playground 기본값
          presence_penalty: 0,  // Playground 기본값
      });

      //console.log("OpenAI Response: ", JSON.stringify(response, null, 2));
      //console.log("OpenAI Response Message: ", response.choices[0].message);


      // 응답 데이터 추출
      if (response.choices && response.choices[0] && response.choices[0].message) {
          const messageContent = response.choices[0].message.content;
          return { content: messageContent }; // JSON 구조로 반환

      } else {
          console.error('Unexpected API response structure:', JSON.stringify(response, null, 2));
          return { error: 'Unexpected API response structure' };
      }

  } catch (error) {
      console.error('ChatGPT API 호출 중 오류 발생:', error);
      throw new Error('ChatGPT API 응답을 받지 못했습니다.');
  }
}

// CDR 점수 계산 함수
function calculateCdrScore(questionCnt, correctCnt, hintCnt) {
  let score = 1;

  const correctRatio = correctCnt / questionCnt;
  if (correctRatio >= 0.8) {
    score = 0;
  } else if (correctRatio >= 0.7) {
    score = 0.5;
  }

  if (hintCnt >= 4) {
    score = Math.max(score, 0.5);
  }

  return score;
}

module.exports = { memoryTest, createScorePrompt, calculateCdrScore };