const express = require('express');
const router = express.Router();

// Get all appointments
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT * FROM appointments ORDER BY date_time ASC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        res.json(results);
    });
});

// Get single appointment by ID
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'SELECT * FROM appointments WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch appointment' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json(results[0]);
    });
});

// Get upcoming appointments
router.get('/upcoming/list', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT * FROM appointments 
        WHERE date_time >= NOW()
        ORDER BY date_time ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
        }
        res.json(results);
    });
});

// Get past appointments
router.get('/past/list', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT * FROM appointments 
        WHERE date_time < NOW()
        ORDER BY date_time DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch past appointments' });
        }
        res.json(results);
    });
});

// Get appointments by type
router.get('/type/:type', (req, res) => {
    const db = req.app.locals.db;
    const { type } = req.params;
    
    const query = 'SELECT * FROM appointments WHERE type = ? ORDER BY date_time ASC';
    
    db.query(query, [type], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        res.json(results);
    });
});

// Get appointments by doctor
router.get('/doctor/:doctor', (req, res) => {
    const db = req.app.locals.db;
    const { doctor } = req.params;
    
    const query = 'SELECT * FROM appointments WHERE doctor LIKE ? ORDER BY date_time ASC';
    
    db.query(query, [`%${doctor}%`], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        res.json(results);
    });
});

// Add new appointment
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { doctor, type, date_time, location } = req.body;
    
    if (!doctor || !type || !date_time) {
        return res.status(400).json({ error: 'Doctor, type, and date_time are required' });
    }
    
    const query = `
        INSERT INTO appointments (doctor, type, date_time, location) 
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [doctor, type, date_time, location || null], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add appointment' });
        }
        
        res.status(201).json({
            message: 'Appointment scheduled successfully',
            id: result.insertId
        });
    });
});

// Update appointment
router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { doctor, type, date_time, location } = req.body;
    
    const query = `
        UPDATE appointments 
        SET doctor = ?, type = ?, date_time = ?, location = ?
        WHERE id = ?
    `;
    
    db.query(query, [doctor, type, date_time, location, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update appointment' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json({ message: 'Appointment updated successfully' });
    });
});

// Delete appointment
router.delete('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'DELETE FROM appointments WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete appointment' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json({ message: 'Appointment deleted successfully' });
    });
});

// Get appointment statistics
router.get('/stats/count', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN date_time >= NOW() THEN 1 ELSE 0 END) as upcoming,
            SUM(CASE WHEN date_time < NOW() THEN 1 ELSE 0 END) as past,
            COUNT(DISTINCT type) as types,
            COUNT(DISTINCT doctor) as doctors
        FROM appointments
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