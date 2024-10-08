// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email service
  auth: {
    user: 'rossarionithish23@gmail.com', // Your email
    pass: 'xtbt ebca lqhn oids' // Your email password or App Password
  }
});

app.post('/send-email', (req, res) => {
    const { to, customerId, password,accountNumber,ifscCode } = req.body;
  
    const mailOptions = {
      from: 'rossarionithish23@gmail.com',
      to,
      subject: 'Your Account has been Approved',
      text: `Welcome to TFC Bank, Future Financial Champion!\n\nYour TFC Bank Account Number: ${accountNumber}\nYour TFC Bank IFSC Code: ${ifscCode}\nYour TFC Bank Customer ID is: ${customerId}\nYour Password is: ${password}\nWe’re here to support you every step of the way!\n\n\nBest Regards\nTFC Bank`
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error); // Log the error
        return res.status(500).send(error.toString());
      }
      res.status(200).send('Email sent: ' + info.response);
    });
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
