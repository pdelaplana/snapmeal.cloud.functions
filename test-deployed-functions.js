#!/usr/bin/env node

/**
 * Simple Firebase Functions Endpoint Tester
 * 
 * Usage: node test-deployed-functions.js
 * 
 * You'll be prompted for:
 * - Firebase project ID and API key
 * - Your email and password
 * 
 * The script will test your endpoints with authentication.
 */

const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

class SimpleTester {
  async getConfig() {
    console.log('🧪 Simple Firebase Functions Tester\\n');
    
    this.projectId = await question('Firebase Project ID: ');
    this.apiKey = await question('Firebase API Key: ');
    this.email = await question('Your email: ');
    this.password = await question('Your password: ');
    this.region = (await question('Region (default: us-central1): ')) || 'us-central1';
    
    console.log('');
  }

  async authenticate() {
    console.log('🔐 Getting auth token...');
    
    const authData = {
      email: this.email,
      password: this.password,
      returnSecureToken: true
    };

    return new Promise((resolve) => {
      const postData = JSON.stringify(authData);
      
      const options = {
        hostname: 'identitytoolkit.googleapis.com',
        path: `/v1/accounts:signInWithPassword?key=${this.apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.idToken) {
              this.idToken = response.idToken;
              console.log('✅ Authentication successful');
              resolve(true);
            } else {
              console.log('❌ Authentication failed:', response.error?.message || 'Invalid credentials');
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Authentication failed: Invalid response');
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Authentication failed:', error.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  async testHealthCheck() {
    console.log('\\n🏥 Testing healthcheck...');
    
    const url = `https://${this.region}-${this.projectId}.cloudfunctions.net/healthcheck`;
    
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.message === 'OK') {
              console.log('✅ Health check passed');
              console.log(`   Uptime: ${response.uptime?.toFixed(2)}s`);
              resolve(true);
            } else {
              console.log('❌ Health check failed');
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Health check failed: Invalid response');
            resolve(false);
          }
        });
      }).on('error', (error) => {
        console.log('❌ Health check failed:', error.message);
        resolve(false);
      });
    });
  }

  async testQueueJob() {
    console.log('\\n📋 Testing queueJob with auth...');
    
    const jobData = {
      data: {
        jobType: 'exportData',
        priority: 1,
        taskData: { testRun: true }
      }
    };

    return new Promise((resolve) => {
      const postData = JSON.stringify(jobData);
      
      const options = {
        hostname: `${this.region}-${this.projectId}.cloudfunctions.net`,
        path: '/queueJob',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.idToken}`,
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.result?.success) {
              console.log('✅ Queue job successful');
              console.log(`   Job ID: ${response.result.jobId}`);
              resolve(true);
            } else {
              console.log('❌ Queue job failed:', response.error?.message || 'Unknown error');
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Queue job failed: Invalid response');
            console.log('   Raw response:', data.substring(0, 200));
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Queue job failed:', error.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  async testUnauthenticated() {
    console.log('\\n🚫 Testing without auth (should fail)...');
    
    const jobData = { data: { jobType: 'exportData' } };

    return new Promise((resolve) => {
      const postData = JSON.stringify(jobData);
      
      const options = {
        hostname: `${this.region}-${this.projectId}.cloudfunctions.net`,
        path: '/queueJob',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error && response.error.status === 'UNAUTHENTICATED') {
              console.log('✅ Correctly rejected unauthenticated request');
              resolve(true);
            } else {
              console.log('❌ Should have rejected unauthenticated request');
              resolve(false);
            }
          } catch (error) {
            console.log('❌ Unexpected response');
            resolve(false);
          }
        });
      });

      req.on('error', (error) => {
        console.log('❌ Request error:', error.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  async run() {
    const results = [];
    
    try {
      await this.getConfig();
      
      // Test authentication
      const authOk = await this.authenticate();
      results.push(['Authentication', authOk]);
      
      // Test health check (no auth needed)
      const healthOk = await this.testHealthCheck();
      results.push(['Health Check', healthOk]);
      
      if (authOk) {
        // Test authenticated endpoint
        const queueOk = await this.testQueueJob();
        results.push(['Queue Job (Auth)', queueOk]);
        
        // Test unauthenticated request
        const unauthOk = await this.testUnauthenticated();
        results.push(['Unauth Rejection', unauthOk]);
      }
      
      // Summary
      console.log('\\n📊 Results');
      console.log('===========');
      const passed = results.filter(([_, ok]) => ok).length;
      
      results.forEach(([test, ok]) => {
        console.log(`${ok ? '✅' : '❌'} ${test}`);
      });
      
      console.log(`\\n${passed}/${results.length} tests passed`);
      return passed === results.length;
      
    } finally {
      rl.close();
    }
  }
}

// Run
new SimpleTester().run()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });