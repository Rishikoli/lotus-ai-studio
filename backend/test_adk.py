import config
import asyncio
import uuid
import traceback
from agents.researcher_adk import run_adk_researcher

async def test_adk():
    print("Testing ADK Researcher Agent...")
    session_id = str(uuid.uuid4())
    user_prompt = "Template constraints: None\nUser Prompt: A gritty cyberpunk detective story set in Neo-Tokyo where a rogue AI is killing off megacorp executives."
    
    try:
        world_bible = await run_adk_researcher(user_prompt=user_prompt, session_id=session_id)
        print("\n=== SUCCESS: World Bible Generated ===")
        print(world_bible)
        print("======================================\n")
    except Exception as e:
        print(f"\n=== ERROR: Failure executing ADK Agent ===")
        traceback.print_exc()
        print("======================================\n")

if __name__ == "__main__":
    asyncio.run(test_adk())
