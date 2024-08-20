const {
  Client,
  GatewayIntentBits,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionResponseType,
} = require("discord.js");
const mysql = require("mysql2");

// Database credentials
const dbConfig = {
  host: "as1.ultra-h.com",
  user: "server_12222",
  password: "oeam6xis2g",
  database: "server_12222_shinji",
};

// Create a connection to the database
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database.");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

const clientId = "1238648465018327060";
const guildId = "1233997149688037426";
const channelId = "1269220234888347708";
const token = "MTIzODY0ODQ2NTAxODMyNzA2MA.GKSRLF.IeOVUNj-8L6lR8KTXg6m2O3FjI0fl4_DizOhxg"; // Replace with your bot's token
const roleId = "1238670671740141629";

let verificationMessageId;
let botMessages = [];

client.once(Events.ClientReady, async () => {
  console.log("Ready!");

  const button = new ButtonBuilder()
    .setCustomId("verify_button")
    .setLabel("Verify")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Verification")
    .setDescription("Click the button below to verify your account.");

  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      const verificationMessage = await channel.send({
        embeds: [embed],
        components: [row],
      });
      verificationMessageId = verificationMessage.id;
      botMessages.push(verificationMessage.id);
      console.log("Verification message sent to the channel.");
    } else {
      console.error("Failed to send message. Channel not found.");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === "verify_button") {
    const modal = new ModalBuilder()
      .setCustomId("verify_modal")
      .setTitle("Verification")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("verification_code")
            .setLabel("Verification Code")
            .setStyle(TextInputStyle.Short),
        ),
      );

    await interaction.showModal(modal);
  }

  if (interaction.type === 5 && interaction.customId === "verify_modal") {
    const verificationCode =
      interaction.fields.getTextInputValue("verification_code");

    connection.query(
      "SELECT * FROM users WHERE verifycode = ?",
      [verificationCode],
      async (err, results) => {
        if (err) {
          console.error("Error querying the database:", err);
          await interaction.reply({
            content: "An error occurred while verifying your code. Please try again later.",
            ephemeral: true,
          });
          return;
        }

        if (results.length > 0 && verificationCode != 0) {
          const user = interaction.user;
          const userName = user.username;
          const userTag = user.tag;
          const userId = user.id;

          const guild = await client.guilds.fetch(guildId);
          const member = await guild.members.fetch(userId);

          if (member.roles.cache.has(roleId)) {
            await interaction.reply({
              content: "You are already verified!",
              ephemeral: true,
            });
            return;
          }

          connection.query(
            "UPDATE users SET discordname = ?, discordtag = ?, verify = ?, verifycode = ? WHERE verifycode = ?",
            [userName, 0, 1, 0, verificationCode],
            async (updateErr) => {
              if (updateErr) {
                console.error("Error updating the database:", updateErr);
                await interaction.reply({
                  content: "An error occurred while updating your record. Please try again later.",
                  ephemeral: true,
                });
                return;
              }

              connection.query(
                "SELECT username FROM users WHERE discordname = ?",
                [userName],
                async (nicknameErr, nicknameResults) => {
                  if (nicknameErr) {
                    console.error("Error querying the username table:", nicknameErr);
                    await interaction.reply({
                      content: "An error occurred while fetching your nickname. Please try again later.",
                      ephemeral: true,
                    });
                    return;
                  }

                  if (nicknameResults.length > 0) {
                    const newNickname = nicknameResults[0].username;

                    try {
                      await member.setNickname(newNickname);
                      console.log(`Updated nickname for user ${userId} to ${newNickname}`);
                    } catch (nicknameErr) {
                      console.error("Error updating nickname:", nicknameErr);
                      await interaction.reply({
                        content: "An error occurred while updating your nickname. Please try again later.",
                        ephemeral: true,
                      });
                      return;
                    }

                    try {
                      await member.roles.add(roleId);
                      console.log(`Added role ${roleId} to user ${userId}`);
                    } catch (roleErr) {
                      console.error("Error adding role:", roleErr);
                      await interaction.reply({
                        content: "An error occurred while adding the role. Please try again later.",
                        ephemeral: true,
                      });
                      return;
                    }

                    const embed = new EmbedBuilder()
                      .setColor(0xb8e83f)
                      .setTitle("Account Verification Success!")
                      .setDescription(
                        `The account **${results[0].username}** has been successfully linked to your Discord account (**${userName}**).\n` +
                        `You will now be able to access general in-game features such as Global Chat, joining events, accessing weapons, etc.\n\n` +
                        `**Welcome to Cityscape Roleplay**`
                      )
                      .setFooter({ text: `Requested by: ${userName}` })
                      .setThumbnail("https://cdn.discordapp.com/attachments/1234892069919658034/1238745153557102622/A38E4541-63DD-4717-86EA-DA27DE15BD4B.png?ex=664066d3&is=663f1553&hm=0d6362af068ceaf08ef2eeca958738d44d83b497d892cb7578b48e2954a6a3ef&");

                    try {
                      const successMessage = await interaction.reply({
                        content: "Success! Your account has been verified. You will now be able to access all the features.",
                        embeds: [embed],
                        ephemeral: true,
                        fetchReply: true, // Fetch the reply to get the message object
                      });

                      // Add a dismiss button
                      const dismissButton = new ButtonBuilder()
                        .setCustomId("dismiss_button")
                        .setLabel("Dismiss")
                        .setStyle(ButtonStyle.Secondary);

                      const dismissRow = new ActionRowBuilder().addComponents(dismissButton);

                      await successMessage.edit({
                        components: [dismissRow],
                      });

                      // Listen for dismiss button clicks
                      const filter = (i) => i.customId === "dismiss_button" && i.user.id === userId;
                      const collector = successMessage.createMessageComponentCollector({ filter, time: 60000 });

                      collector.on("collect", async (i) => {
                        if (i.customId === "dismiss_button") {
                          await successMessage.delete();
                        }
                      });

                      collector.on("end", () => {
                        successMessage.delete().catch(console.error);
                      });
                    } catch (error) {
                      console.error("Error sending verification success message:", error);
                      await interaction.reply({
                        content: "An error occurred while sending the success message. Please try again later.",
                        ephemeral: true,
                      });
                    }
                  } else {
                    await interaction.reply({
                      content: "No nickname found for your Discord account.",
                      ephemeral: true,
                    });
                  }
                }
              );
            }
          );
        } else {
          await interaction.reply({
            content: "Invalid verification code. Please try again.",
            ephemeral: true,
          });
          botMessages.push(interaction.id);
        }
      }
    );
  }
});

client.login(token);
