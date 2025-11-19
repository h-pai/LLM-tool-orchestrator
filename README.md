# 🧭 Date Assistant

A lightweight example of a **tool-based AI assistant framework** that plans and executes tool calls based on user input.  
Built using components inspired by [chatbot-ui-lite](https://github.com/mckaywrigley/chatbot-ui-lite).

---

## 📘 Overview

The **Date Assistant** interprets natural language queries like:
> “What day will it be 3 days from now?”  
> “What day was it 2 days ago?”

It can:
- Get today’s or a shifted date.
- Find the weekday for a given date.

If the query isn’t related to dates, it returns `TOOL_NOT_AVAILABLE`.

---

## ⚙️ Project Structure

/src
├── lib/
│ ├── assistants/
│ │ ├── baseAssistant.ts # Generic assistant class
│ │ └── dateAssistant.ts # Assistant specialized for date queries
│ └── tools/
│ ├── getCurrentDate.ts # Returns today’s or offset date
│ └── getDayOfWeek.ts # Returns weekday for a given date
├── pages/
│ └── api/
│ └── chat.ts # API endpoint handling model planning and tool execution

---

## 🚀 Usage

1. **Install dependencies**
    ```bash
    npm install
    ```

2. **Add environment variables**

     You can connect this to any compatible AI model endpoint.

     Create a .env.local file:
    
    ```env
    OPENAI_API_KEY=your-api-key
    OPENAI_API_BASE_URL=https://your-model-endpoint
    OPENAI_DEPLOYMENT_NAME=model-name
    OPENAI_API_VERSION=latest
    ```
    

3. **Run locally**

    ```bash
    npm run dev
    
4. **Test the API**

    ```bash
    curl -X POST http://localhost:3000/ \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "What day will it be 2 days later?"}]}'
    ```

## 🧩 Extend It

Create new assistants by:
- Defining tools in /lib/tools
- Creating a new assistant using BaseAssistant
- Connecting it through /api/chat

Each tool should define:
    
```ts
export const sampleTool = {
    definition: { name, description, parameters },
    handler: async (args) => { ... }
};
```
