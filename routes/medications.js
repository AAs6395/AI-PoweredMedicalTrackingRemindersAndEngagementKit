const express = require('express');
const router = express.Router();

// Get all medications
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT * FROM medications ORDER BY time ASC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch medications' });
        }
        res.json(results);
    });
});

// Get single medication by ID
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'SELECT * FROM medications WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch medication' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Medication not found' });
        }
        
        res.json(results[0]);
    });
});

// Add new medication
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { name, dosage, frequency, time } = req.body;
    
    if (!name || !dosage || !frequency || !time) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    const query = 'INSERT INTO medications (name, dosage, frequency, time) VALUES (?, ?, ?, ?)';
    
    db.query(query, [name, dosage, frequency, time], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add medication' });
        }
        
        res.status(201).json({
            message: 'Medication added successfully',
            id: result.insertId
        });
    });
});

// Update medication (mark as taken)
router.put('/:id/taken', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { taken } = req.body;
    
    const query = 'UPDATE medications SET taken = ? WHERE id = ?';
    
    db.query(query, [taken, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update medication' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Medication not found' });
        }
        
        res.json({ message: 'Medication updated successfully' });
    });
});

// Update medication details
router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { name, dosage, frequency, time } = req.body;
    
    const query = 'UPDATE medications SET name = ?, dosage = ?, frequency = ?, time = ? WHERE id = ?';
    
    db.query(query, [name, dosage, frequency, time, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update medication' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Medication not found' });
        }
        
        res.json({ message: 'Medication updated successfully' });
    });
});

// Delete medication
router.delete('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'DELETE FROM medications WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete medication' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Medication not found' });
        }
        
        res.json({ message: 'Medication deleted successfully' });
    });
});

// Get medication statistics
router.get('/stats/count', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT COUNT(*) as total, SUM(taken) as taken, COUNT(*) - SUM(taken) as pending FROM medications';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch statistics' });
        }
        
        res.json(results[0]);
    });
});

module.exports = router;