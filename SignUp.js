import React, { useState } from 'react';
import './Signup.css'; 

const SignUp = ({ onSignUpSuccess, onBackToLogin }) => {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false); // Add this line

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateEmail = (email) => {
    return email.endsWith('@umt.edu.pk');
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(form.email)) {
      setMessage('Email must end with "@umt.edu.pk"');
      setIsSuccess(false); // Add this line
      return;
    }

    if (!validatePassword(form.password)) {
      setMessage('Password must be at least 8 characters long');
      setIsSuccess(false); // Add this line
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        setMessage('The user has registered successfully. Please return to the login tab.');
        setIsSuccess(true); // Add this line
      } else {
        setMessage(data.message);
        setIsSuccess(false); // Add this line
      }
    } catch (error) {
      console.error('Error signing up:', error);
      setMessage('An error occurred. Please try again.');
      setIsSuccess(false); // Add this line
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
          <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          
          <button type="submit">Sign Up</button>
        </form>
        {message && <p className={`message ${isSuccess ? 'success' : 'error'}`}>{message}</p>} {/* Modify this line */}
        <button className="back-button" onClick={onBackToLogin}>Back to Login</button>
      </div>
    </div>
  );
};

export default SignUp;
