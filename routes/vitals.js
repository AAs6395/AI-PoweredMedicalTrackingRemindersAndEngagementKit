const express = require('express');
const router = express.Router();

// Get all vital signs records
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT * FROM vitals ORDER BY recorded_date DESC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch vital signs' });
        }
        res.json(results);
    });
});

// Get single vital record by ID
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'SELECT * FROM vitals WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch vital signs' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Vital record not found' });
        }
        
        res.json(results[0]);
    });
});

// Get vital signs by date range
router.get('/range/dates', (req, res) => {
    const db = req.app.locals.db;
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    const query = `
        SELECT * FROM vitals 
        WHERE DATE(recorded_date) BETWEEN ? AND ?
        ORDER BY recorded_date DESC
    `;
    
    db.query(query, [start_date, end_date], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch vital signs' });
        }
        res.json(results);
    });
});

// Get latest vital signs
router.get('/latest/record', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT * FROM vitals ORDER BY recorded_date DESC LIMIT 1';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch latest vital signs' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'No vital records found' });
        }
        
        res.json(results[0]);
    });
});

// Add new vital signs record
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { blood_pressure, heart_rate, temperature, blood_sugar } = req.body;
    
    if (!blood_pressure && !heart_rate && !temperature && !blood_sugar) {
        return res.status(400).json({ error: 'At least one vital sign is required' });
    }
    
    const query = `
        INSERT INTO vitals (blood_pressure, heart_rate, temperature, blood_sugar) 
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [
        blood_pressure || null,
        heart_rate || null,
        temperature || null,
        blood_sugar || null
    ], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add vital signs' });
        }
        
        res.status(201).json({
            message: 'Vital signs recorded successfully',
            id: result.insertId
        });
    });
});

// Update vital signs record
router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { blood_pressure, heart_rate, temperature, blood_sugar } = req.body;
    
    const query = `
        UPDATE vitals 
        SET blood_pressure = ?, heart_rate = ?, temperature = ?, blood_sugar = ?
        WHERE id = ?
    `;
    
    db.query(query, [blood_pressure, heart_rate, temperature, blood_sugar, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update vital signs' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vital record not found' });
        }
        
        res.json({ message: 'Vital signs updated successfully' });
    });
});

// Delete vital signs record
router.delete('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'DELETE FROM vitals WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete vital record' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vital record not found' });
        }
        
        res.json({ message: 'Vital record deleted successfully' });
    });
});

// Get vital signs statistics
router.get('/stats/summary', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT 
            COUNT(*) as total_records,
            AVG(heart_rate) as avg_heart_rate,
            MIN(heart_rate) as min_heart_rate,
            MAX(heart_rate) as max_heart_rate,
            AVG(temperature) as avg_temperature,
            AVG(blood_sugar) as avg_blood_sugar
        FROM vitals
        WHERE heart_rate IS NOT NULL OR temperature IS NOT NULL OR blood_sugar IS NOT NULL
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        
        res.json(results[0]);
    });
});

module.exports = router;