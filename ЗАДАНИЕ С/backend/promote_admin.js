const mysql = require('mysql2/promise');

async function promoteToAdmin() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'Aqmola Start'
    });

    const email = 'negmetansar4@gmail.com'; // User from logs

    try {
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found!');
            return;
        }

        const userId = users[0].id;
        console.log(`Found user: ${users[0].name} (ID: ${userId})`);

        // Check if is_admin column exists
        try {
            await connection.execute('UPDATE users SET is_admin = 1 WHERE id = ?', [userId]);
            console.log('Successfully promoted user to admin!');
        } catch (e) {
            console.log('Error updating user. Trying to add column first...');
            try {
                await connection.execute('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE');
                await connection.execute('UPDATE users SET is_admin = 1 WHERE id = ?', [userId]);
                console.log('Column added and user promoted!');
            } catch (alterError) {
                console.error('Failed to update schema:', alterError.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

promoteToAdmin();
