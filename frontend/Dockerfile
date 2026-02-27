# 빌드 단계
FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 3번 검증: package.json 안에 "build": "vite build" 스크립트가 있나요?
RUN npm run build

# 실행 단계 (서버용)
FROM nginx:stable-alpine
# 4번 검증: Vite는 빌드하면 결과물이 'dist' 폴더에 생깁니다. 
# 만약 설정에서 'build' 폴더로 바꾸셨다면 아래 경로도 바꿔야 합니다.
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]