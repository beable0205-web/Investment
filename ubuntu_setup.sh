#!/bin/bash
echo "🚀 펀드매니저 AI 클라우드 서버 세팅 시작..."

# 1. 패키지 업데이트 및 필수 패키지 설치
sudo apt-get update
sudo apt-get install -y curl git unzip

# 2. Node.js (v20) 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. PM2 글로벌 설치 (무중단 실행 도구)
sudo npm install -g pm2

# 4. 크롬 브라우저 필수 종속성 설치 (Puppeteer/렌더링 봇을 위해 필요할 수 있음)
sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi-dev libxtst-dev libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0

echo "✅ 서버 기본 세팅 완료!"
echo "--------------------------------------------------------"
echo "이제 다음 명령어를 차례대로 입력하여 봇을 가동하세요:"
echo "1. 코드를 서버로 복사/다운로드 받으세요 (git clone 또는 압축 해제)"
echo "2. 프로젝트 폴더로 이동: cd Investment"
echo "3. 필수 패키지 설치: npm install"
echo "4. .env.local 파일 생성: nano .env.local (API 키 입력 후 저장)"
echo "5. 웹 대시보드 빌드: npm run build"
echo "6. 24시간 백그라운드 봇 가동: pm2 start ecosystem.config.js"
echo "--------------------------------------------------------"
