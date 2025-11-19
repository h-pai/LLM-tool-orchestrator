# Assistant Framework

A lightweight, developer-friendly framework for building **custom AI chatbots** using assistants and tools.  
Inspired in part by the UI structure from [chatbot-ui-lite](https://github.com/mckaywrigley/chatbot-ui-lite).

This framework helps developers quickly create chatbots that can do real tasks — by planning and executing tool calls instead of relying on one big prompt.

---

## Why this exists

Most chatbot implementations become difficult to manage because:

- Everything is packed into one long prompt  
- There is no clean way for the chatbot to call actual functions  
- Each new feature requires rewriting the bot  
- Developers can't easily have multiple assistants for different use cases  

This framework solves that by giving you:

- A **BaseAssistant** class (core logic)
- A simple **tool system** (your functions)
- The ability to create **multiple assistants** based on your use cases  
- A clear separation between *AI planning* and *backend execution*

It works with **any LLM provider** that supports chat completions.

---

## How it works

1. You define **tools** → actual functions the chatbot can call.  
2. You define an **assistant** → a unit with its own system prompt + tools.  
3. The model only returns a **JSON plan** of tool calls.  
4. Your backend executes the plan step-by-step.  
5. The final result is returned to the user.

This makes your chatbot:
- Predictable  
- Modular  
- Easy to extend  
- Safe (LLM doesn't execute code — *you* do)

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
