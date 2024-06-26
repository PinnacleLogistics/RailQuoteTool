const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

let contacts = []; // This should be replaced with a database in a real application
let emailSettings = {
    senderEmail: 'your-email@yourdomain.com',        // Replace with your Google Workspace email
    senderName: 'Your Name',                         // Replace with your name
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: 'your-email@yourdomain.com',       // Replace with your Google Workspace email
    smtpPassword: 'your-app-password',               // Replace with your app-specific password
    emailSubject: 'Rail Quote Request',
    emailTemplate: `
        Hello, 
        
        We are looking for a quote on the following lane. Please send over your best all-in rate!
        
        BCO: [BCO]
        Pickup Location: [Pickup Location]
        Delivery Location: [Delivery Location]
        Volumes: [Volumes]
        Container Size: [40 or 53 container]
        Live / Drop: [Live / Drop]
        Commodity: [Commodity]
        Special requirements: [Special requirements]
        
        -------------------------------------------‐--------
        Pinnacle Logistics (Agency of Priority 1)
        Operations Team
        Ops Team Phone (call or text): 602-603-4133
        -----------------------------------------------------
    `,
    replyToEmail: 'reply-to-email@yourdomain.com'     // Replace with the reply-to email
};

// Load contacts and settings from a file or database in a real application
if (fs.existsSync('contacts.json')) {
    contacts = JSON.parse(fs.readFileSync('contacts.json'));
}

if (fs.existsSync('emailSettings.json')) {
    emailSettings = JSON.parse(fs.readFileSync('emailSettings.json'));
}

app.post('/send-quote', async (req, res) => {
    const data = req.body;
    const transporter = nodemailer.createTransport({
        host: emailSettings.smtpServer,
        port: emailSettings.smtpPort,
        secure: false,
        auth: {
            user: emailSettings.smtpUsername,
            pass: emailSettings.smtpPassword
        }
    });

    const emailPromises = contacts.map(contact => {
        const emailBody = emailSettings.emailTemplate
            .replace('[BCO]', data.bco)
            .replace('[Pickup Location]', data.pickupLocation)
            .replace('[Delivery Location]', data.deliveryLocation)
            .replace('[Volumes]', data.volumes)
            .replace('[40 or 53 container]', data.containerSize)
            .replace('[Live / Drop]', data.liveDrop)
            .replace('[Commodity]', data.commodity)
            .replace('[Special requirements]', data.specialRequirements);

        return transporter.sendMail({
            from: `"${emailSettings.senderName}" <${emailSettings.senderEmail}>`,
            to: contact.quoteEmail,
            subject: emailSettings.emailSubject,
            text: emailBody,
            replyTo: emailSettings.replyToEmail
        });
    });

    try {
        await Promise.all(emailPromises);
        res.status(200).send('Emails sent successfully');
    } catch (error) {
        console.error('Error sending emails:', error);
        res.status(500).send('Failed to send emails');
    }
});

app.get('/settings', (req, res) => {
    res.sendFile(__dirname + '/public/settings.html');
});

app.get('/get-settings', (req, res) => {
    res.json(emailSettings);
});

app.post('/save-settings', (req, res) => {
    emailSettings = req.body;
    fs.writeFileSync('emailSettings.json', JSON.stringify(emailSettings, null, 2));
    res.status(200).send('Settings saved successfully');
});

// Contact Management Endpoints

app.get('/contacts', (req, res) => {
    res.json(contacts);
});

app.post('/contacts', (req, res) => {
    const newContact = {
        id: contacts.length ? contacts[contacts.length - 1].id + 1 : 1,
        nameInEmail: req.body.nameInEmail,
        carrierName: req.body.carrierName,
        quoteEmail: req.body.quoteEmail,
        mcNumber: req.body.mcNumber
    };
    contacts.push(newContact);
    fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
    res.status(201).json(newContact);
});

app.put('/contacts', (req, res) => {
    const contactId = parseInt(req.body.contactId, 10);
    const contactIndex = contacts.findIndex(contact => contact.id === contactId);
    if (contactIndex !== -1) {
        contacts[contactIndex] = {
            id: contactId,
            nameInEmail: req.body.nameInEmail,
            carrierName: req.body.carrierName,
            quoteEmail: req.body.quoteEmail,
            mcNumber: req.body.mcNumber
        };
        fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
        res.status(200).json(contacts[contactIndex]);
    } else {
        res.status(404).send('Contact not found');
    }
});

app.get('/contacts/:id', (req, res) => {
    const contactId = parseInt(req.params.id, 10);
    const contact = contacts.find(contact => contact.id === contactId);
    if (contact) {
        res.json(contact);
    } else {
        res.status(404).send('Contact not found');
    }
});

app.delete('/contacts/:id', (req, res) => {
    const contactId = parseInt(req.params.id, 10);
    contacts = contacts.filter(contact => contact.id !== contactId);
    fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
    res.status(200).send('Contact deleted');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
