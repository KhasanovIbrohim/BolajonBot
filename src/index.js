const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const { TOKEN } = require('./config');
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())

// Replace the connection details with your actual PostgreSQL database credentials
const pool = new Pool({ connectionString: "postgres://xuyzptbo:n5nQ7cPym0pQq6X4jDKvOsVW9-Rf7xZD@satao.db.elephantsql.com/xuyzptbo" });

// Create a dictionary to store the logged-in users
const loggedInUsers = {};

// Create a new instance of TelegramBot with your bot token
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Check if the user is already logged in
  if (loggedInUsers[chatId]) {
    // User is already logged in, send the menu
    sendMenu(chatId);
  } else {
    // User is not logged in, prompt for login
    bot.sendMessage(chatId, 'Please enter your phone number:', {
      reply_markup: {
        keyboard: [[{ text: 'Share phone number', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
});

// Handle the received phone number
bot.on('contact', (msg) => {
  const chatId = msg.chat.id;
  const phoneNumber = msg.contact.phone_number;

  // Check if the user is already logged in
  if (loggedInUsers[chatId]) {
    bot.sendMessage(chatId, 'You are already logged in!');
    sendMenu(chatId);
  } else {
    // Check if the user exists in the database
    pool.query('SELECT * FROM patients WHERE patient_phone = $1', [phoneNumber], (err, res) => {
      if (err) {
        console.error('Error executing query', err);
        return;
      }

      if (res.rows.length > 0) {
        // User exists in the database, set as logged in
        loggedInUsers[chatId] = res.rows[0].patient_id;
        bot.sendMessage(chatId, 'Login successful!');
        sendMenu(chatId);
      } else {
        bot.sendMessage(chatId, 'User does not exist!');
      }
    });
  }
});

// Function to send the menu
function sendMenu(chatId) {
    const menuOptions = {
        caption: 'Welcome to Bolajon Med Bot! Please select an option:',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Personal Cabinet 👤', callback_data: 'personalCabinet' }, { text: 'Orders 🛒', callback_data: 'orders' }],
            [{ text: 'Contact ☎️', callback_data: 'contact' },{ text: 'Our Doctors 👩‍🔬', callback_data: 'doctors' }],
            [{ text: 'Branches 🏥', callback_data: 'branches' },{ text: 'Log Out 🚫', callback_data: 'logout' }]
          ],
        },
    };

    bot.sendPhoto(chatId, fs.readFileSync(path.resolve(__dirname, './images/main.jpg')), menuOptions)
}

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
  
    const data = query.data;
  
    switch (data) {
      case 'orders':
        if (loggedInUsers[chatId]) {
            const userId = loggedInUsers[chatId];
            pool.query('SELECT * FROM daily_services WHERE service_patient = $1', [userId], (err, res) => {
              if (err) {
                console.error('Error executing query', err);
                return;
              }
    
              if (res.rows.length > 0) {
                for(let i = 0; i < res.rows.length; i++){
                        if(i == res.rows.length - 1){
                            let order = res.rows[i];
                            let message = `Time: ${order.statistics_of}\nStatus: ${order.statistics_status}`;
                            const keyboardOptions = {
                                reply_markup: {
                                        inline_keyboard: [
                                [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
                                ],
                            },
                            }
                            bot.sendMessage(chatId, message, keyboardOptions);
                        } 
                    else {
                        let order = res.rows[i];
                        let message = `Time: ${order.statistics_of}\nStatus: ${order.statistics_status}`;
                        bot.sendMessage(chatId, message);
                    }
                };
                } else {
                const keyboardOptions = {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
                      ],
                    },
                };
                bot.sendMessage(chatId, "Orders are empty", keyboardOptions);
              }
            });
          } else {
            bot.sendMessage(chatId, 'You are not logged in!');
          }
        break;
      case 'contact':
        const option2Back = {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
              ],
            },
          };
          bot.sendMessage(chatId, 'Soon', option2Back);
        break;
      case 'doctors':
        const option3Back = {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
              ],
            },
          };
          bot.sendMessage(chatId, 'Soon', option3Back);
        break;
        case 'branches':
            const option4Back = {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
                  ],
                },
              };
              bot.sendMessage(chatId, 'Soon', option4Back);
            break;  
          case 'logout':

            const option5Back = {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
                  ],
                },
              };
              bot.sendMessage(chatId, 'Soon', option5Back);
            break;   
      case 'personalCabinet':
        // Check if the user is logged in
        if (loggedInUsers[chatId]) {
          const userId = loggedInUsers[chatId];
  
          // Fetch user information from the database based on the saved user ID
          pool.query('SELECT patient_name, patient_surname, patient_lastname, patient_phone FROM patients WHERE patient_id = $1', [userId], (err, res) => {
            if (err) {
              console.error('Error executing query', err);
              return;
            }
  
            if (res.rows.length > 0) {
              const user = res.rows[0];
              const message = `Name: ${user.patient_name}\nSurname: ${user.patient_surname}\nLastname: ${user.patient_lastname}\nPhone: ${user.patient_phone}`;
              const keyboardOptions = {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Back 🔙', callback_data: 'mainMenu' }],
                  ],
                },
              };
              bot.sendMessage(chatId, message, keyboardOptions);
            } else {
              bot.sendMessage(chatId, 'User not found');
            }
          });
        } else {
          bot.sendMessage(chatId, 'You are not logged in!');
        }
        break;
      case 'mainMenu':
        sendMenu(chatId);
        break;
      default:
        break;
    }
  });
  

app.get('/', (req, res) => {
    res.send("OK")
})

app.listen(process.env.PORT || 9999)