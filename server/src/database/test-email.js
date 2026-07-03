const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'suryavanshivam@gmail.com',
    pass: 'epxxkkcdcwuxfifm',
  },
});

console.log('Sending test email...');
transporter.sendMail({
  from: '"Damini Test" <suryavanshivam@gmail.com>',
  to: 'suryavanshivam@gmail.com',
  subject: 'Damini SMTP Test Mail',
  text: 'This is a test email from Damini local configuration setup.',
}).then(info => {
  console.log('✅ Email sent successfully!', info.messageId);
}).catch(err => {
  console.error('❌ Email failed:', err);
});
