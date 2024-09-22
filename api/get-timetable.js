const xlsx = require('xlsx');
const path = require('path');

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const name = req.body.name;

        // 엑셀 파일 불러오기 및 데이터 처리 로직 추가
        const workbook = xlsx.readFile(path.resolve('./time.xlsx'));
        const studentSheet = workbook.Sheets['학생'];
        const classSheet = workbook.Sheets['반'];

        // 데이터 처리 후 결과 전송
        res.json({ timetable: [], classmates: [] });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
