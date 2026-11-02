# Cove

Android TV / Google TV용 개인 홈 화면(런처) 앱이에요. 내 TV에 직접 설치(사이드로딩)해서 쓰는 용도이고, 플레이스토어 배포용이 아니에요.

웹페이지를 TV 브라우저로 여는 방식이 아니라 **TV에 설치되는 진짜 앱**이에요. 그래서 타일을 누르면 넷플릭스, 유튜브 같은 **TV 앱이 그대로 실행**돼요.

## 기능

| 기능 | 내용 |
|---|---|
| 앱 타일 | TV에 설치된 앱을 자동으로 찾아 실제 배너와 아이콘으로 보여줘요. 브랜드 색은 로고에서 자동으로 뽑아요 |
| 디자인 3종 | **Glass**(사진 위 유리 타일), **Icons**(브랜드 컬러 아이콘), **Minimal**(큰 시계와 로고 한 줄) |
| 배경 8장 | 코드로 그린 풍경 8장 (`tools/make_backgrounds.py`) + 폰에서 보낸 내 사진 |
| 꾸미기 | 배경 어둡게 4단계, 타일 6종(앱 배너, 글래스, 브랜드 컬러, 프로스트, 다크, 투명), 앱 이름 표시, 글꼴 4종, 시계(24시간, 12시간, 숨김) |
| 앱 고르기 | 홈에 둘 앱과 순서 정하기 |
| 폰 리모컨 | 설정 화면의 QR을 폰으로 찍으면 방향키, OK, 뒤로, 디자인, 배경 바꾸기, 내 사진 보내기 |
| 홈 버튼 전환 | 접근성 권한을 켜면 홈 버튼이나 TV 전원을 켰을 때 Cove가 떠요 (선택 사항) |

TV 리모컨의 **메뉴 버튼**을 누르면 어디서든 꾸미기 패널이 열려요.

## APK 받기

`app/` 아래 코드가 바뀌어 푸시되면 GitHub Actions가 APK를 빌드해요.

- **Releases → "Cove latest build" → `Cove.apk`** 에서 항상 최신 빌드를 받을 수 있어요.
- 또는 **Actions → Build Cove APK → 최신 실행 → Artifacts → `Cove-apk`** (zip 안에 APK가 있어요)

## TV에 설치하기

먼저 TV에서 **개발자 모드**를 켜요: 설정 → 시스템 → 정보 → **Android TV OS 빌드**를 7번 누르기. 메뉴 이름은 TV마다 조금 달라요.

### 방법 1. PC에서 ADB로 설치 (추천)

1. TV 설정 → 시스템 → 개발자 옵션 → **USB 디버깅**(또는 네트워크 디버깅) 켜기
2. TV의 IP 주소 확인: 설정 → 네트워크 → 연결된 와이파이
3. PC에 [Android platform-tools](https://developer.android.com/tools/releases/platform-tools)를 설치하고:

```bash
adb connect 192.168.0.23:5555
```

```bash
adb install -r Cove.apk
```

TV에 "USB 디버깅을 허용할까요?"가 뜨면 **허용**을 눌러요. 숫자는 내 TV의 IP로 바꿔요.

### 방법 2. USB 메모리

APK를 USB 메모리에 넣어 TV에 꽂고, TV의 파일 관리자 앱으로 열어 설치해요. 처음 한 번 "출처를 알 수 없는 앱 설치"를 그 파일 관리자에게 허용해야 해요.

### 방법 3. Downloader 앱

저장소가 공개(public)일 때만 가능해요. 플레이스토어에서 Downloader를 설치하고, Releases의 `Cove.apk` 주소를 입력해서 받아요.

## 홈 버튼 누르면 Cove가 뜨게 하기

설치만 하면 앱 목록에 Cove가 하나 생겨요. 홈 화면 자체로 쓰려면 둘 중 하나를 해요.

**A. 접근성 방식 (PC 필요 없음)**
1. Cove 실행 → 오른쪽 위 **설정** → **홈 버튼으로 Cove 열기** 선택
2. TV 접근성 설정이 열리면 **Cove 홈 버튼 전환**을 켜요
3. 홈 버튼을 눌러 확인해요. 기본 홈이 아주 잠깐 보였다가 Cove로 바뀔 수 있어요.

Cove 설정에서 언제든 다시 끌 수 있어요. 이 기능은 어떤 앱이 앞에 떴는지만 확인하고, 화면 내용은 읽지 않아요.

**B. ADB 방식 (기본 홈을 끄기)**

Cove를 먼저 설치한 다음에 해요.

```bash
adb shell pm disable-user --user 0 com.google.android.apps.tv.launcherx
```

되돌리기:

```bash
adb shell pm enable com.google.android.apps.tv.launcherx
```

기본 홈을 끄면 Google 계정 추천이나 Google Home 연동 같은 일부 기능이 이상해질 수 있어요. 구형 Android TV는 패키지 이름이 `com.google.android.tvlauncher`일 수 있어요.

## 폰 리모컨

Cove 설정을 열면 QR 코드가 보여요. 폰 카메라로 찍으면 리모컨 페이지가 열려요.

- 폰과 TV가 **같은 와이파이**에 있어야 해요.
- 리모컨 서버는 TV의 8765 포트에서 돌아가고, QR 주소에 들어 있는 연결 코드가 있어야만 명령을 받아요.
- **폰 사진을 TV 배경으로**를 누르면 사진이 TV 안에만 저장돼요. 인터넷으로 나가지 않아요.

## 미리보기 (TV 없이)

`app/src/main/assets/www/index.html`을 PC 브라우저로 열면 샘플 앱으로 화면을 볼 수 있어요. 방향키로 이동, Enter로 선택, Esc로 뒤로, `m`으로 꾸미기 패널을 열어요.

## 구조

```
app/src/main/java/com/mirinetic/cove/
  MainActivity.kt         홈 화면. 리모컨 키를 화면으로 전달하고, 홈 버튼에 반응
  AppRepository.kt        설치된 TV 앱 목록, 배너와 아이콘, 브랜드 색
  Bridge.kt               화면(JavaScript) ↔ TV 연결: 앱 실행, 설정 저장
  LocalContent.kt         화면 파일과 앱 이미지를 앱 안에서 제공 (네트워크 사용 안 함)
  RemoteServer.kt         폰 리모컨용 작은 웹서버
  HomeOverrideService.kt  홈 버튼 전환 (접근성 서비스)
  Store.kt, Qr.kt         설정과 사진 저장, QR 코드
app/src/main/assets/www/  TV 화면(index.html, app.css, app.js)과 폰 리모컨(remote.html), 배경 이미지
tools/make_backgrounds.py 배경 이미지 생성 스크립트
```

## 서명 키

`keystore/cove-personal.jks`는 개인 설치용 고정 키예요. 매번 같은 키로 서명해서 새 버전을 설치해도 설정이 유지돼요. 비밀번호가 빌드 파일에 그대로 들어 있으니 이 키로 서명한 앱을 다른 사람에게 배포하지 마세요.

## 직접 빌드

Android Studio로 이 폴더를 열고 Run을 누르거나, Android SDK가 있는 PC에서:

```bash
./gradlew assembleRelease
```

결과물: `app/build/outputs/apk/release/app-release.apk`
