# SmartChoose Creator Automation Suite - 100% Working Setup Guide

To bypass the terrible API limits of Instagram, Facebook, and YouTube, we use **n8n** as our Automation Engine. It receives a single ping from your SmartChoose Admin Panel and safely handles all the complex API bursting in the background.

## STEP 1: Deploying n8n to the Cloud (Free/Cheap)
We will deploy n8n directly using its official container image since Railway recently hid the template search.

1. Go back to your Railway Dashboard.
2. Click **New Project** in the top right.
3. Select **Deploy a Docker Image** (do *not* select Deploy a Template).
4. In the search bar that appears, type exactly: `n8nio/n8n`
5. Press Enter.
6. Railway will automatically build and launch the official n8n server. It takes about 2 minutes.
7. Once it has a green checkmark, look for your **n8n App URL** (e.g., `https://n8n-production-xxxx.up.railway.app`) in the Settings or overview tab.
8. Click that URL and create your n8n Admin Account!

## STEP 2: Creating the Multi-Platform Reel Publisher Workflow 
When you click "Publish" in SmartChoose, it sends the reel data to n8n.

1. In n8n, click **"Add Workflow"**.
2. Add a **Webhook Node**.
   - Method: `POST`
   - Path: `publish-reel`
   - Grab the **Test URL**.
3. Now, open your SmartChoose `proxy-server/api/publish-reel.js` file (which we built earlier) and paste that n8n Webhook URL into the `N8N_WEBHOOK_URL` variable.
4. From the Webhook node in n8n, you can drag lines to connect to the **Facebook Graph API**, **YouTube API**, **Twitter Node**, etc. n8n has built-in nodes for all of these! 
5. Authenticate those nodes by signing into your respective accounts.

## STEP 3: Creating the Comment Auto-DM Workflow
When a user comments on your Reel, Meta sends a ping to SmartChoose, which forwards it to n8n to send the DM.

1. In n8n, add another **Webhook Node**.
   - Method: `POST`
   - Path: `process-comment`
2. Open your `proxy-server/api/webhooks/comments.js` file and paste this URL into the `N8N_COMMENT_PROCESSOR` variable.
3. Connect the Webhook node to an **Instagram/Facebook Messenger Node**.
4. Configure it to send the `commentText` and Product Link back to the user via Direct Message.

## STEP 4: Meta Developer Setup
To allow n8n to post to your Instagram and read your comments:
1. Go to [developers.facebook.com](https://developers.facebook.com/) and click **Create App** (Type: Business).
2. Add the **Instagram Graph API** product.
3. Add the **Messenger** product (this handles DMs).
4. Go to **Webhooks** in the Meta dashboard, choose "Instagram", and hit "Edit Subscription".
5. Paste your *SmartChoose Vercel Proxy URL* (e.g., `https://your-smartchoose.vercel.app/api/webhooks/comments`) into the Callback URL.
6. The Verify Token is `smartchoose_automation_token_123` (as defined in our proxy script).
7. Subscribe to the `comments` and `messages` fields.

You are now fully connected! Upload a reel in SmartChoose, and watch n8n do the heavy lifting.
