const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'telegram_miniapp'
};

async function createMatchingTables() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');

        console.log('Creating investor_profiles table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS investor_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        investor_type ENUM('angel', 'vc', 'corporate', 'accelerator') NOT NULL,
        investment_range_min INT,
        investment_range_max INT,
        preferred_stages JSON,
        preferred_industries JSON,
        geographic_focus JSON,
        portfolio_size INT DEFAULT 0,
        successful_exits INT DEFAULT 0,
        preferred_technologies JSON,
        bio TEXT,
        linkedin_url VARCHAR(255),
        website_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✅ investor_profiles table created');

        console.log('Creating startup_profiles table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS startup_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        startup_name VARCHAR(255) NOT NULL,
        industry VARCHAR(100) NOT NULL,
        stage ENUM('idea', 'pre-seed', 'seed', 'series-a', 'series-b', 'series-c') NOT NULL,
        funding_goal INT,
        current_revenue INT DEFAULT 0,
        team_size INT DEFAULT 1,
        founded_year INT,
        location VARCHAR(100),
        technologies JSON,
        problem_statement TEXT,
        solution_description TEXT,
        target_market TEXT,
        competitive_advantage TEXT,
        pitch_deck_url VARCHAR(255),
        website_url VARCHAR(255),
        demo_url VARCHAR(255),
        logo_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_industry (industry),
        INDEX idx_stage (stage)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✅ startup_profiles table created');

        console.log('Creating matches table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        investor_id INT NOT NULL,
        startup_id INT NOT NULL,
        compatibility_score DECIMAL(5,2),
        investor_interest ENUM('pending', 'interested', 'passed') DEFAULT 'pending',
        startup_interest ENUM('pending', 'interested', 'passed') DEFAULT 'pending',
        is_mutual BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (investor_id) REFERENCES investor_profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (startup_id) REFERENCES startup_profiles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_match (investor_id, startup_id),
        INDEX idx_investor (investor_id),
        INDEX idx_startup (startup_id),
        INDEX idx_mutual (is_mutual)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✅ matches table created');

        console.log('Creating match_scores table...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS match_scores (
        id INT PRIMARY KEY AUTO_INCREMENT,
        match_id INT NOT NULL,
        industry_score DECIMAL(3,2),
        stage_score DECIMAL(3,2),
        investment_score DECIMAL(3,2),
        geography_score DECIMAL(3,2),
        technology_score DECIMAL(3,2),
        overall_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
        INDEX idx_match_id (match_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✅ match_scores table created');

        console.log('\n🎉 All matching system tables created successfully!');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

createMatchingTables()
    .then(() => {
        console.log('\n✅ Database setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Database setup failed:', error);
        process.exit(1);
    });
