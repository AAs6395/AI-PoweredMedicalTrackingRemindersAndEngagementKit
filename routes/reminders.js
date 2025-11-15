const express = require('express');
const router = express.Router();

// Get all reminders
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    
    const query = 'SELECT * FROM reminders ORDER BY date_time ASC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch reminders' });
        }
        res.json(results);
    });
});

// Get single reminder by ID
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'SELECT * FROM reminders WHERE id = ?';
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch reminder' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        
        res.json(results[0]);
    });
});

// Get today's reminders
router.get('/today/list', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT * FROM reminders 
        WHERE DATE(date_time) = CURDATE() 
        ORDER BY date_time ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch today\'s reminders' });
        }
        res.json(results);
    });
});

// Get upcoming reminders (next 7 days)
router.get('/upcoming/week', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT * FROM reminders 
        WHERE date_time >= NOW() 
        AND date_time <= DATE_ADD(NOW(), INTERVAL 7 DAY)
        ORDER BY date_time ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch upcoming reminders' });
        }
        res.json(results);
    });
});

// Add new reminder
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { title, date_time, notes } = req.body;
    
    if (!title || !date_time) {
        return res.status(400).json({ error: 'Title and date_time are required' });
    }
    
    const query = 'INSERT INTO reminders (title, date_time, notes) VALUES (?, ?, ?)';
    
    db.query(query, [title, date_time, notes || null], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add reminder' });
        }
        
        res.status(201).json({
            message: 'Reminder added successfully',
            id: result.insertId
        });
    });
});

// Update reminder
router.put('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { title, date_time, notes } = req.body;
    
    const query = 'UPDATE reminders SET title = ?, date_time = ?, notes = ? WHERE id = ?';
    
    db.query(query, [title, date_time, notes, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update reminder' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        
        res.json({ message: 'Reminder updated successfully' });
    });
});

// Mark reminder as notified
router.put('/:id/notify', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'UPDATE reminders SET notified = TRUE WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update reminder' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        
        res.json({ message: 'Reminder marked as notified' });
    });
});

// Delete reminder
router.delete('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { id } = req.params;
    
    const query = 'DELETE FROM reminders WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete reminder' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }
        
        res.json({ message: 'Reminder deleted successfully' });
    });
});

// Get reminder statistics
router.get('/stats/count', (req, res) => {
    const db = req.app.locals.db;
    
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN DATE(date_time) = CURDATE() THEN 1 ELSE 0 END) as today,
            SUM(CASE WHEN date_time >= NOW() THEN 1 ELSE 0 END) as upcoming,
            SUM(CASE WHEN date_time < NOW() THEN 1 ELSE 0 END) as past
        FROM reminders
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