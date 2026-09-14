let mailTransport = null;

const getMailTransport = async () => {
  if (mailTransport) return mailTransport;

  const hasSmtpConfig =
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (!hasSmtpConfig) {
    return null;
  }

  const nodemailerModule = await import('nodemailer');
  const nodemailer = nodemailerModule.default || nodemailerModule;

  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return mailTransport;
};

export const sendAppointmentApprovedEmail = async ({
  patientName,
  patientEmail,
  doctorName,
  date,
  time,
  reason,
  hospitalName
}) => {
  try {
    const transporter = await getMailTransport();
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `Appointment Approved with Dr. ${doctorName}`;
    const text = [
      `Hello ${patientName},`,
      '',
      'Your appointment has been approved.',
      `Doctor: Dr. ${doctorName}`,
      `Hospital: ${hospitalName || 'Smart EHR Hospital'}`,
      `Date: ${formattedDate}`,
      `Time: ${time}`,
      `Reason: ${reason}`,
      '',
      'Please arrive 10 minutes early.',
      '',
      'Smart EHR Team'
    ].join('\n');

    if (!transporter) {
      // Development fallback when SMTP is not configured.
      console.info('Appointment approval email (SMTP not configured):', {
        to: patientEmail,
        subject,
        text
      });
      return { sent: false, skipped: true };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: patientEmail,
      subject,
      text
    });

    return { sent: true };
  } catch (error) {
    console.error('Failed to send appointment approval email:', error.message);
    return { sent: false, error: error.message };
  }
};
