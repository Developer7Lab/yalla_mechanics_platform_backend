const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mechanic-app');
    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Create 5 normal users
    const normalUsers = [
      {
        username: 'user1',
        password: 'password123',
        role: 'user',
        fullName: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        profileData: {
          bio: 'Car enthusiast looking for reliable mechanics',
          phone: '+1234567890'
        }
      },
      {
        username: 'user2',
        password: 'password123',
        role: 'user',
        fullName: 'Fatima Ali',
        email: 'fatima@example.com',
        profileData: {
          bio: 'Regular customer seeking quality service',
          phone: '+1234567891'
        }
      },
      {
        username: 'user3',
        password: 'password123',
        role: 'user',
        fullName: 'Omar Khalil',
        email: 'omar@example.com',
        profileData: {
          bio: 'New to the area, need trusted mechanics',
          phone: '+1234567892'
        }
      },
      {
        username: 'user4',
        password: 'password123',
        role: 'user',
        fullName: 'Aisha Mohammed',
        email: 'aisha@example.com',
        profileData: {
          bio: 'Looking for honest and professional service',
          phone: '+1234567893'
        }
      },
      {
        username: 'user5',
        password: 'password123',
        role: 'user',
        fullName: 'Yusuf Ibrahim',
        email: 'yusuf@example.com',
        profileData: {
          bio: 'Vehicle maintenance is important to me',
          phone: '+1234567894'
        }
      }
    ];

    // Create 5 mechanic users
    const mechanicUsers = [
      {
        username: 'mechanic1',
        password: 'password123',
        role: 'mechanic',
        fullName: 'Ali Mechanic Shop',
        email: 'ali.mechanic@example.com',
        profileData: {
          bio: 'Specialized in engine repair and maintenance',
          phone: '+1234567895'
        }
      },
      {
        username: 'mechanic2',
        password: 'password123',
        role: 'mechanic',
        fullName: 'Hassan Auto Service',
        email: 'hassan.auto@example.com',
        profileData: {
          bio: 'Expert in electrical systems and diagnostics',
          phone: '+1234567896'
        }
      },
      {
        username: 'mechanic3',
        password: 'password123',
        role: 'mechanic',
        fullName: 'Karim Car Care',
        email: 'karim.care@example.com',
        profileData: {
          bio: 'Full service auto repair and body work',
          phone: '+1234567897'
        }
      },
      {
        username: 'mechanic4',
        password: 'password123',
        role: 'mechanic',
        fullName: 'Mustafa Motors',
        email: 'mustafa.motors@example.com',
        profileData: {
          bio: 'Transmission and brake specialists',
          phone: '+1234567898'
        }
      },
      {
        username: 'mechanic5',
        password: 'password123',
        role: 'mechanic',
        fullName: 'Bilal Auto Repair',
        email: 'bilal.auto@example.com',
        profileData: {
          bio: 'Quick service and competitive prices',
          phone: '+1234567899'
        }
      }
    ];

    // Create 1 central admin user
    const adminUser = {
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      fullName: 'System Administrator',
      email: 'admin@example.com',
      profileData: {
        bio: 'Central admin managing location requests',
        phone: '+1234567800'
      }
    };

    // Insert all users
    const allUsers = [...normalUsers, ...mechanicUsers, adminUser];
    
    for (const userData of allUsers) {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created ${userData.role}: ${userData.username}`);
      } else {
        console.log(`User ${userData.username} already exists, skipping...`);
      }
    }

    console.log('\n=== Seed Data Summary ===');
    console.log('Normal Users (5):');
    normalUsers.forEach(u => console.log(`  - Username: ${u.username}, Password: ${u.password}`));
    console.log('\nMechanic Users (5):');
    mechanicUsers.forEach(u => console.log(`  - Username: ${u.username}, Password: ${u.password}`));
    console.log('\nAdmin User (1):');
    console.log(`  - Username: ${adminUser.username}, Password: ${adminUser.password}`);
    console.log('\n========================\n');

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedUsers();
