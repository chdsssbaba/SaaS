const bcrypt = require('bcrypt');

async function generateHashes() {
    const passwords = {
        'Admin@123': await bcrypt.hash('Admin@123', 10),
        'Demo@123': await bcrypt.hash('Demo@123', 10),
        'User@123': await bcrypt.hash('User@123', 10)
    };

    console.log('Password Hashes:');
    console.log('Admin@123:', passwords['Admin@123']);
    console.log('Demo@123:', passwords['Demo@123']);
    console.log('User@123:', passwords['User@123']);
}

generateHashes();
