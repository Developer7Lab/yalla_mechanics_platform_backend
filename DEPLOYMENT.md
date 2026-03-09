# Deployment Guide

This guide will help you deploy the Mechanic App to production.

## Prerequisites

- A server with Node.js installed (Ubuntu/Debian recommended)
- MongoDB instance (local or cloud like MongoDB Atlas)
- Domain name (optional but recommended)
- SerpAPI account with API key

## Option 1: Deploy to VPS (Ubuntu/Debian)

### 1. Server Setup

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (if hosting locally)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2 for process management
sudo npm install -g pm2
\`\`\`

### 2. Upload Application

\`\`\`bash
# Clone or upload your application
cd /var/www/
sudo mkdir mechanic-app
sudo chown $USER:$USER mechanic-app
cd mechanic-app

# Upload files via SCP, Git, or FTP
# Example with Git:
git clone <your-repo-url> .

# Or use SCP from local machine:
# scp -r /home/ubuntu/mechanic-app/* user@server:/var/www/mechanic-app/
\`\`\`

### 3. Install Dependencies

\`\`\`bash
cd /var/www/mechanic-app
npm install --production
\`\`\`

### 4. Configure Environment

\`\`\`bash
# Create .env file
nano .env
\`\`\`

Add your production configuration:

\`\`\`env
MONGODB_URI=mongodb://localhost:27017/mechanic-app
SESSION_SECRET=your-very-secure-random-secret-key-here
SERPAPI_KEY=your_serpapi_key_here
PORT=3000
NODE_ENV=production
\`\`\`

### 5. Seed Database

\`\`\`bash
node seed.js
\`\`\`

### 6. Start Application with PM2

\`\`\`bash
# Start the application
pm2 start server.js --name mechanic-app

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
\`\`\`

### 7. Configure Nginx Reverse Proxy

\`\`\`bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mechanic-app
\`\`\`

Add the following configuration:

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

Enable the site:

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/mechanic-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

### 8. Configure Firewall

\`\`\`bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
\`\`\`

### 9. Install SSL Certificate (Optional but Recommended)

\`\`\`bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
\`\`\`

### 10. Update Session Cookie Settings for HTTPS

Edit \`server.js\` and update the session configuration:

\`\`\`javascript
cookie: {
  maxAge: 1000 * 60 * 60 * 24 * 7,
  httpOnly: true,
  secure: true, // Change to true for HTTPS
  sameSite: 'lax'
}
\`\`\`

Restart the application:

\`\`\`bash
pm2 restart mechanic-app
\`\`\`

## Option 2: Deploy to Cloud Platform

### Heroku

1. Install Heroku CLI
2. Create a new Heroku app
3. Add MongoDB Atlas add-on or use external MongoDB
4. Set environment variables:
   \`\`\`bash
   heroku config:set MONGODB_URI=your_mongodb_uri
   heroku config:set SESSION_SECRET=your_secret
   heroku config:set SERPAPI_KEY=your_key
   heroku config:set NODE_ENV=production
   \`\`\`
5. Deploy:
   \`\`\`bash
   git push heroku main
   \`\`\`

### DigitalOcean App Platform

1. Create a new app
2. Connect your Git repository
3. Configure environment variables in the dashboard
4. Deploy automatically on push

### AWS EC2

Similar to VPS deployment above, but use AWS-specific security groups and IAM roles.

## MongoDB Atlas Setup (Recommended for Production)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster (free tier available)
3. Create database user
4. Whitelist your server IP address
5. Get connection string
6. Update MONGODB_URI in .env:
   \`\`\`
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mechanic-app?retryWrites=true&w=majority
   \`\`\`

## SerpAPI Setup

1. Sign up at https://serpapi.com/
2. Get your API key from dashboard
3. Choose appropriate plan based on usage
4. Add key to .env file

## Post-Deployment Checklist

- [ ] Application is accessible via domain/IP
- [ ] Login works for all user types
- [ ] MongoDB connection is stable
- [ ] SerpAPI integration works
- [ ] Sessions persist correctly
- [ ] HTTPS is configured (if applicable)
- [ ] Firewall rules are set
- [ ] PM2 auto-restart is configured
- [ ] Database is seeded with initial users
- [ ] Logs are being generated
- [ ] Backup strategy is in place

## Monitoring

### View Logs

\`\`\`bash
# PM2 logs
pm2 logs mechanic-app

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
\`\`\`

### Monitor Application

\`\`\`bash
# PM2 monitoring
pm2 monit

# System resources
htop
\`\`\`

## Backup Strategy

### Database Backup

\`\`\`bash
# Create backup script
nano /home/ubuntu/backup-db.sh
\`\`\`

Add:

\`\`\`bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/mechanic-app" --out="/backups/mongodb_$DATE"
# Keep only last 7 days of backups
find /backups -type d -mtime +7 -exec rm -rf {} +
\`\`\`

Make executable and schedule:

\`\`\`bash
chmod +x /home/ubuntu/backup-db.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
\`\`\`

## Maintenance

### Update Application

\`\`\`bash
cd /var/www/mechanic-app
git pull origin main
npm install --production
pm2 restart mechanic-app
\`\`\`

### Update Dependencies

\`\`\`bash
npm update
pm2 restart mechanic-app
\`\`\`

### Check Application Status

\`\`\`bash
pm2 status
pm2 info mechanic-app
\`\`\`

## Troubleshooting

### Application Won't Start

\`\`\`bash
# Check PM2 logs
pm2 logs mechanic-app --lines 100

# Check if port is in use
sudo lsof -i :3000

# Restart application
pm2 restart mechanic-app
\`\`\`

### MongoDB Connection Issues

\`\`\`bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
\`\`\`

### Nginx Issues

\`\`\`bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
\`\`\`

## Security Best Practices

1. **Use strong passwords** for all accounts
2. **Enable firewall** and only open necessary ports
3. **Use HTTPS** with valid SSL certificate
4. **Keep system updated**: \`sudo apt update && sudo apt upgrade\`
5. **Use environment variables** for sensitive data
6. **Regular backups** of database and application
7. **Monitor logs** for suspicious activity
8. **Limit MongoDB access** to specific IPs
9. **Use strong SESSION_SECRET** (at least 32 random characters)
10. **Implement rate limiting** for API endpoints (optional)

## Performance Optimization

1. **Enable Gzip compression** in Nginx
2. **Use CDN** for static assets
3. **Implement caching** for frequently accessed data
4. **Optimize MongoDB indexes**
5. **Use connection pooling** for MongoDB
6. **Monitor and optimize** slow queries

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, HAProxy, AWS ELB)
2. Deploy multiple application instances
3. Use Redis for session storage (shared across instances)
4. Use MongoDB replica set for high availability

### Vertical Scaling

1. Upgrade server resources (CPU, RAM)
2. Optimize database queries
3. Implement caching layer (Redis, Memcached)

---

**Deployment completed! Your application should now be live and accessible.**
