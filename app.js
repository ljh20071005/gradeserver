const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const xlsx = require('xlsx');

// Express 애플리케이션 생성
const app = express();
const port = 1005;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 엑셀 파일 읽기
let workbook;
let studentData = [];
let classData = [];
const studentMap = new Map();

try {
    const filePath = path.join(__dirname, 'time.xlsx');
    console.log(`엑셀 파일 경로: ${filePath}`); // 경로를 확인하기 위해 출력
    workbook = xlsx.readFile(filePath); // 엑셀 파일을 불러오기
    console.log('엑셀 파일 읽기 성공');
    
    // "학생" 시트와 "반" 시트 데이터 로드
    const studentSheetName = '학생';
    const classSheetName = '반';

    studentData = xlsx.utils.sheet_to_json(workbook.Sheets[studentSheetName], { header: 1 });
    classData = xlsx.utils.sheet_to_json(workbook.Sheets[classSheetName], { header: 1 });

    console.log('엑셀 데이터 로드 성공');

    // 학생 데이터를 인덱싱해서 이름으로 빠르게 검색할 수 있도록 저장
    studentData.forEach((row, i) => {
        const name = extract_name(row[0]);
        studentMap.set(name, i); // 학생 이름을 인덱스와 함께 저장
    });

} catch (error) {
    console.error('엑셀 파일을 읽는 동안 오류 발생:', error);
    process.exit(1); // 서버 시작을 중단
}

// 이름에서 숫자를 제거하는 함수 (학번 제거)
function extract_name(full_name) {
    return String(full_name).replace(/[0-9]/g, '').trim();
}

// 과목명에서 (n시간)을 제거하는 함수
function cleanSubjectName(subject) {
    return String(subject).replace(/\(\d+시간\)/g, '').trim();
}

// 학생 시간표 추출 함수 (학생 시트 기반)
function getStudentTimetable(studentName) {
    let timetable = [];
    const studentRowIndex = studentMap.get(studentName);

    if (studentRowIndex === undefined) {
        return { error: `${studentName} 학생의 시간표를 찾을 수 없습니다.` };
    }

    // 학생 이름을 찾은 경우에 시간표를 추출
    for (let i = studentRowIndex + 1; i < studentData.length; i++) {
        const row = studentData[i];
        if (row.every(cell => !cell)) break;  // 빈 줄이 나오면 종료

        timetable.push(row.map(cell => cleanSubjectName(cell || '공강')));
    }

    return timetable;
}

// 반 친구 목록 추출 함수 (반 시트 기반)
function getClassmates(studentName) {
    const classmates = [];

    // 반에서 같은 과목을 듣는 친구들 찾기
    for (const row of classData) {
        const class_name = row[0];  // 반 이름
        const students_in_class = row.slice(7).map(val => extract_name(val)).filter(Boolean);

        if (students_in_class.includes(studentName)) {
            const classmates_for_subject = students_in_class.filter(student => student !== studentName && student.trim() !== '');
            classmates.push({
                subject: class_name,
                students: classmates_for_subject
            });
        }
    }

    return classmates.length > 0 ? classmates : { error: `${studentName} 학생의 반 친구를 찾을 수 없습니다.` };
}

// 루트 경로에서 index.html 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// POST 요청 처리: 학생 이름으로 시간표 및 반 친구 목록 조회
app.post('/get-timetable', (req, res) => {
    try {
        const name = extract_name(req.body.name);
        const timetable = getStudentTimetable(name);
        const classmates = getClassmates(name);

        if (timetable.error || classmates.error) {
            res.status(404).json({
                success: false,
                message: timetable.error || classmates.error
            });
        } else {
            res.json({
                success: true,
                timetable,
                classmates
            });
        }
    } catch (error) {
        console.error('데이터 처리 중 오류 발생:', error);
        res.status(500).json({ success: false, message: '서버에서 데이터를 처리하는 동안 오류가 발생했습니다.' });
    }
});

// 서버 실행
app.listen(port, () => {
    console.log(`Wow! :) Server is running on http://localhost:${port}`);
});
