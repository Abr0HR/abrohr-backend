require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// ============ HEALTH CHECKS ============
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

app.get('/api/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'Database connected', timestamp: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'Database error', error: error.message });
  }
});

// ============ AUTH ENDPOINTS ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, company_id, role = 'employee' } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, company_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, hashedPassword, name, company_id, role]
    );
    const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, process.env.JWT_SECRET || 'secret');
    res.status(201).json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
    const validPassword = await bcrypt.compare(password, result.rows[0].password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: result.rows[0].id, email: result.rows[0].email }, process.env.JWT_SECRET || 'secret');
    res.json({ user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EMPLOYEE ENDPOINTS ============
app.get('/api/employees', async (req, res) => {
  try {
    const { company_id } = req.query;
    let query = 'SELECT * FROM employees';
    let values = [];
    if (company_id) {
      query += ' WHERE company_id = $1';
      values = [company_id];
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/employees/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, phone, position, department, company_id, user_id } = req.body;
    const employeeId = 'EMP' + Date.now();
    const result = await pool.query(
      'INSERT INTO employees (name, email, phone, position, department, company_id, user_id, employee_id_string) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, email, phone, position, department, company_id, user_id, employeeId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ATTENDANCE ENDPOINTS ============
app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { employee_id, status = 'present', mode = 'office', remarks } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      'INSERT INTO attendance (employee_id, date, time_in, status, mode, remarks) VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING *',
      [employee_id, today, status, mode, remarks]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/:employee_id', async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = 'SELECT * FROM attendance WHERE employee_id = $1';
    let values = [req.params.employee_id];
    if (month && year) {
      query += ' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3';
      values.push(month, year);
    }
    query += ' ORDER BY date DESC';
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/attendance/summary/:employee_id', async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();
    const result = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_count,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE status = 'leave') as leave_count,
        COUNT(*) FILTER (WHERE mode = 'wfh') as wfh_count
      FROM attendance 
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM date) = $2`,
      [req.params.employee_id, currentYear]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LEAVES ENDPOINTS ============
app.post('/api/leaves/apply', async (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date, reason } = req.body;
    const numDays = Math.ceil((new Date(to_date) - new Date(from_date)) / (1000 * 60 * 60 * 24)) + 1;
    const result = await pool.query(
      'INSERT INTO leaves (employee_id, leave_type, from_date, to_date, number_of_days, reason, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [employee_id, leave_type, from_date, to_date, numDays, reason, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaves/:employee_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM leaves WHERE employee_id = $1 ORDER BY from_date DESC',
      [req.params.employee_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/leaves/:leave_id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body;
    const result = await pool.query(
      'UPDATE leaves SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['approved', approved_by, req.params.leave_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/leaves/:leave_id/reject', async (req, res) => {
  try {
    const { rejection_reason, approved_by } = req.body;
    const result = await pool.query(
      'UPDATE leaves SET status = $1, rejection_reason = $2, approved_by = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      ['rejected', rejection_reason, approved_by, req.params.leave_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REGULARIZATION ENDPOINTS ============
app.post('/api/regularizations/apply', async (req, res) => {
  try {
    const { employee_id, attendance_id, reason } = req.body;
    const result = await pool.query(
      'INSERT INTO regularizations (employee_id, attendance_id, reason, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [employee_id, attendance_id, reason, 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/regularizations', async (req, res) => {
  try {
    const { company_id, status } = req.query;
    let query = 'SELECT r.*, e.name, e.employee_id_string FROM regularizations r JOIN employees e ON r.employee_id = e.id';
    let values = [];
    if (company_id && status) {
      query += ' WHERE e.company_id = $1 AND r.status = $2';
      values = [company_id, status];
    }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/regularizations/:reg_id/approve', async (req, res) => {
  try {
    const { approved_by } = req.body;
    const result = await pool.query(
      'UPDATE regularizations SET status = $1, approved_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      ['approved', approved_by, req.params.reg_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ COMPANIES ENDPOINTS ============
app.post('/api/companies', async (req, res) => {
  try {
    const { name, email, phone, address, industry } = req.body;
    const result = await pool.query(
      'INSERT INTO companies (name, email, phone, address, industry) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, address, industry]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint does not exist' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AbrO HR Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
