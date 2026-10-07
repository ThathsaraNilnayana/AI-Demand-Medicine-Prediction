const db = require('./db');
(async () => {
    try {
        const m = await db.get("SELECT * FROM medicines WHERE medicine_name LIKE '%Medi%' OR medicine_name LIKE '%Plus%'");
        console.log('MED:', m);
        if (m) {
            const p = await db.all("SELECT * FROM predictions WHERE medicine_id=?", [m.medicine_id]);
            console.log('PRED ROWS:', p.length, 'MONTHS:', p.map(x=>x.prediction_month));
            const s = await db.all("SELECT * FROM sales_data WHERE medicine_id=? ORDER BY sale_date", [m.medicine_id]);
            console.log('SALES ROWS:', s.length, 'MIN:', s[0]?.sale_date, 'MAX:', s[s.length-1]?.sale_date);
            const m2 = await db.get("SELECT * FROM predictions WHERE medicine_id=? LIMIT 1", [m.medicine_id]);
            console.log('MODEL TYPE:', m2?.model_type);
        } else {
            console.log('No Medi-Plus found, listing all:');
            const all = await db.all("SELECT medicine_id, medicine_name FROM medicines");
            console.log(all);
        }
    } catch (e) {
        console.error(e);
    }
})();
