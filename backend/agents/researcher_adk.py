from google.adk import Agent
from google.adk.runners import InMemoryRunner
from google.genai import types

def analyze_genre_tropes(genre: str) -> str:
    """Returns classic tropes and themes for a given genre to ground the research."""
    tropes = {
        "cyberpunk": "Neon-lit cityscapes, advanced technology vs low life, megacorporations, hackers, cybernetic enhancements, moral ambiguity, rebellious protagonists.",
        "fantasy": "Magic systems, ancient prophecies, mythical creatures, medieval-like settings, epic quests, clear good vs evil, legendary artifacts.",
        "scifi": "Space exploration, alien species, advanced AI, futuristic weapons, speculative societies, philosophical themes of humanity.",
        "horror": "Isolation, supernatural entities, psychological dread, suspense, dark and oppressive atmosphere, survival.",
        "noir": "Cynical detective, femme fatale, black-and-white aesthetic, urban decay, shadow lighting, moral ambiguity, jazz soundtracks."
    }
    return tropes.get(genre.lower().strip(), "Standard dramatic narrative with conflict, climax, and resolution. Focus on character growth.")

# Initialize the ADK Agent
researcher_agent = Agent(
    name="Researcher",
    model="gemini-2.5-pro", # Upgrade to Gemini 2.5 Pro
    instruction="""You are an expert World Builder and Researcher. 
You must analyze the user's prompt and use the `analyze_genre_tropes` tool to gather foundational context about the genre.
Then, output a comprehensive 'World Bible' in Markdown format summarizing the setting, tone, and core conflict based on the prompt.""",
    tools=[analyze_genre_tropes],
)

# Initialize the ADK Runner
runner = InMemoryRunner(app_name="LotusAIStudio", agent=researcher_agent)

async def run_adk_researcher(user_prompt: str, session_id: str) -> str:
    """
    Executes the ADK Researcher Agent to generate the world bible.
    Wraps the google-adk InMemoryRunner.run_async method.
    """
    # Create the genai content object
    new_message = types.Content(
        role="user",
        parts=[types.Part(text=user_prompt)]
    )

    # Create session in the InMemoryRunner's session service
    runner.session_service.create_session(
        app_name=runner.app_name,
        user_id="default_user",
        session_id=session_id
    )

    full_response = ""
    # ADK runners yield events. We concatenate text from final response events.
    async for event in runner.run_async(
        user_id="default_user",
        session_id=session_id,
        new_message=new_message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            # Extract the text from the model's final response
            parts_text = "".join(
                [part.text for part in event.content.parts if getattr(part, 'text', None)]
            )
            full_response += parts_text

    return full_response.strip()
