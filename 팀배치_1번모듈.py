import pandas as pd
import random
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import openpyxl
import os
import psutil
import subprocess

# 파일 열기 대화상자 함수
def open_file_dialog():
    file_path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx *.xls")])
    return file_path

# 파일 저장 대화상자 함수
def save_file_dialog():
    file_path = filedialog.asksaveasfilename(defaultextension=".xlsx", filetypes=[("Excel files", "*.xlsx *.xls")])
    return file_path

# 파일이 열려 있는지 확인하는 함수
def is_file_open(file_path):
    for proc in psutil.process_iter(['pid', 'name']):
        if proc.info['name'] == 'EXCEL.EXE':
            try:
                for file in proc.open_files():
                    if file.path == file_path:
                        return True
            except psutil.AccessDenied:
                continue
    return False

# 모든 엑셀 파일이 열려 있는지 확인하는 함수
def are_any_excel_files_open():
    for proc in psutil.process_iter(['pid', 'name']):
        if proc.info['name'] == 'EXCEL.EXE':
            try:
                if any(file.path.endswith(('.xlsx', '.xls')) for file in proc.open_files()):
                    return True
            except psutil.AccessDenied:
                continue
    return False

# 프로그램 시작 함수
def start_program():
    # 입력 파일 경로 가져오기
    file_path = input_file_path.get()
    if not file_path:
        messagebox.showerror("오류", "엑셀 파일을 선택하지 않았습니다.")
        return

    # 입력 파일이 열려 있는지 확인
    if is_file_open(file_path):
        messagebox.showerror("오류", "엑셀 파일이 열려 있습니다. 파일을 닫고 다시 시도하세요.")
        return

    # 모든 엑셀 파일이 열려 있는지 확인
    if are_any_excel_files_open():
        messagebox.showerror("오류", "엑셀 파일이 열려 있습니다. 모든 엑셀 파일을 닫고 다시 시도하세요.")
        return

    # 출력 파일 경로 가져오기
    save_path = output_file_path.get()
    if not save_path:
        messagebox.showerror("오류", "저장할 파일 경로를 선택하지 않았습니다.")
        return

    # 출력 파일이 열려 있는지 확인
    if is_file_open(save_path):
        messagebox.showerror("오류", "저장할 파일 경로에 있는 파일이 열려 있습니다. 파일을 닫고 다시 시도하세요.")
        return

    # 진행 상황 초기화
    progress_bar['value'] = 0
    root.update_idletasks()

    # 사용자 입력 값 가져오기
    등급열 = grade_column.get()
    성별열 = gender_column.get()
    총팀수 = int(team_count.get())

    # 입력 파일 읽기
    df = pd.read_excel(file_path)

    # 컬럼명 변경 및 추가 컬럼 생성
    rename_map = {
        "통합평균등급": "토요예배 출석부 등급",
        "작성자": "담당자",
        "작성자 전화번호": "담당자 전화번호",
        "토요예배": "그룹모임",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    extra_columns = [
        "25 직분",
        "25새가족",
        "PLT 수료 현황",
        "현재상태 기타설명란",
        "예정사항 기타설명란",
        "특별소견내용",
        "비고"
    ]
    for col in extra_columns:
        if col not in df.columns:
            df[col] = ""
    progress_bar['value'] = 10
    root.update_idletasks()

    # 데이터 셔플
    df_shuffled = df.sample(frac=1).reset_index(drop=True)
    progress_bar['value'] = 20
    root.update_idletasks()

    # 남성과 여성 각각의 등급별로 그룹화
    grouped = df_shuffled.groupby([성별열, 등급열])
    progress_bar['value'] = 30
    root.update_idletasks()

    # 팀 리스트 초기화
    teams = [[] for _ in range(총팀수)]

    # 각 그룹을 순차적으로 팀에 배분
    team_index = 0
    total_groups = len(grouped)
    processed_groups = 0
    for _, group in grouped:
        for idx, row in group.iterrows():
            teams[team_index].append(row)
            team_index = (team_index + 1) % 총팀수
        processed_groups += 1
        progress_bar['value'] = 30 + (50 * processed_groups / total_groups)
        root.update_idletasks()

    # 결과를 새로운 엑셀 파일로 저장
    with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
        # 랜덤 셔플 결과 시트 추가
        df_shuffled.to_excel(writer, sheet_name="랜덤셔플결과", index=False)
        workbook = writer.book
        sheet = workbook["랜덤셔플결과"]
        sheet.sheet_properties.tabColor = "FF0000"  # 빨간색

        # 그룹화된 내용 시트 추가
        for name, group in grouped:
            group.to_excel(writer, sheet_name=f"{name[0]}-{name[1]}", index=False)
            sheet = workbook[f"{name[0]}-{name[1]}"]
            sheet.sheet_properties.tabColor = "FF0000"  # 빨간색

        # 팀 배치 결과 시트 추가
        for i, team in enumerate(teams):
            team_df = pd.DataFrame(team)
            team_df.to_excel(writer, sheet_name=f'팀{i+1}', index=False)
    progress_bar['value'] = 100
    root.update_idletasks()

    messagebox.showinfo("완료", "팀 배치가 완료되었습니다. 결과는 저장된 파일에서 확인하세요.")
    
    # 파일 탐색기에서 폴더 열기
    folder_path = os.path.abspath(os.path.dirname(save_path))
    if os.path.exists(folder_path):
        subprocess.Popen(f'explorer "{folder_path}"')
    else:
        messagebox.showerror("오류", "폴더를 열 수 없습니다. 경로를 확인하세요.")

    progress_bar['value'] = 0

# Tkinter GUI 설정
root = tk.Tk()
root.title("팀 배치 프로그램")
root.geometry("700x400")
root.configure(bg="#f0f0f0")

# 스타일 설정
style = ttk.Style()
style.theme_use('clam')  # 'clam', 'alt', 'default', 'classic' 중 선택
style.configure("TLabel", font=("맑은 고딕", 12), background="#f0f0f0")
style.configure("TButton", font=("맑은 고딕", 12), background="#4CAF50", foreground="white")
style.map("TButton", background=[('active', '#45a049')], foreground=[('active', 'white')])
style.configure("TEntry", font=("맑은 고딕", 12))
style.configure("TProgressbar", thickness=20)

# 설명 레이블
description = ttk.Label(root, text="이 프로그램은 엑셀 파일을 읽어와서 등급과 성별에 따라 팀을 랜덤으로 배치합니다.")
description.grid(row=0, column=0, columnspan=3, padx=10, pady=10, sticky="ew")

# INPUT 엑셀 파일 경로
ttk.Label(root, text="INPUT 파일경로:").grid(row=1, column=0, padx=10, pady=5, sticky="e")
input_file_path = ttk.Entry(root, width=50)
input_file_path.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
tk.Button(root, text="파일 선택", command=lambda: input_file_path.insert(0, open_file_dialog())).grid(row=1, column=2, padx=10, pady=5, sticky="ew")

# OUTPUT 엑셀 파일 경로
ttk.Label(root, text="OUTPUT 저장경로:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
output_file_path = ttk.Entry(root, width=50)
output_file_path.grid(row=2, column=1, padx=10, pady=5, sticky="ew")
tk.Button(root, text="다른 이름으로 저장(S)", command=lambda: output_file_path.insert(0, save_file_dialog())).grid(row=2, column=2, padx=10, pady=5, sticky="ew")

# 등급 열 이름
ttk.Label(root, text="등급계산용 열 이름:").grid(row=3, column=0, padx=10, pady=5, sticky="e")
grade_column = ttk.Entry(root, width=50)
grade_column.grid(row=3, column=1, padx=10, pady=5, sticky="ew")
grade_column.insert(0, '토요예배 출석부 등급')

# 성별 열 이름
ttk.Label(root, text="성별계산용 열 이름:").grid(row=4, column=0, padx=10, pady=5, sticky="e")
gender_column = ttk.Entry(root, width=50)
gender_column.grid(row=4, column=1, padx=10, pady=5, sticky="ew")
gender_column.insert(0, '성별')

# 총 팀 수
ttk.Label(root, text="총 팀 수:").grid(row=5, column=0, padx=10, pady=5, sticky="e")
team_count = ttk.Entry(root, width=50)
team_count.grid(row=5, column=1, padx=10, pady=5, sticky="ew")
team_count.insert(0, '36')

# 진행 상황 표시
progress_bar = ttk.Progressbar(root, orient="horizontal", length=400, mode="determinate")
progress_bar.grid(row=6, column=1, columnspan=2, pady=20, padx=10, sticky="ew")

# 시작 버튼
ttk.Button(root, text="시작", command=start_program, style="TButton").grid(row=7, column=0, columnspan=3, pady=20, sticky="ew")

root.mainloop()
