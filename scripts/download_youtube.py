import yt_dlp
import os
import sys

def download_subtitles(url, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    ydl_opts = {
        'skip_download': True,        # 실제 영상은 다운받지 않음
        'writesubtitles': True,       # 수동 자막 다운로드
        'writeautomaticsub': True,    # 자동 생성 자막 다운로드 (수동 자막이 없을 경우)
        'subtitleslangs': ['ko'],     # 한국어 자막 우선
        'subtitlesformat': 'vtt',     # vtt 포맷
        'outtmpl': os.path.join(output_dir, '%(title)s.%(ext)s'),
        'ignoreerrors': True,         # 에러 무시하고 다음 영상 진행
        'extract_flat': False,
        'matchtitle': '기법|차트|분석|비법|매매|단타|스윙|돌파|지지|저항',
    }

    print(f"--- 유튜브 자막 수집 시작: {url} ---")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    print("--- 수집 완료 ---")

if __name__ == '__main__':
    target_url = sys.argv[1] if len(sys.argv) > 1 else 'https://www.youtube.com/@%EC%A3%BC%EC%8B%9D%EB%8B%A8%ED%85%8C/videos'
    output_path = os.path.join(os.getcwd(), '기술적분석')
    
    download_subtitles(target_url, output_path)
