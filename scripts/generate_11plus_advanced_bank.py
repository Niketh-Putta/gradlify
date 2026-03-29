import csv
import json
import uuid

from generators.number import generate_number_questions
from generators.algebra import generate_algebra_questions
from generators.geometry import generate_geometry_questions
from generators.stats import generate_stats_questions
from generators.strategies import generate_strategies_questions

def main():
    print("Generating advanced 11+ question bank (60 questions per subtopic)...")
    
    questions = []
    questions.extend(generate_number_questions())
    questions.extend(generate_algebra_questions())
    questions.extend(generate_geometry_questions())
    questions.extend(generate_stats_questions())
    questions.extend(generate_strategies_questions())
    
    print(f"Total logic-varied questions generated: {len(questions)}")
    
    output_path = 'supabase/data/generated/11plus_premium_question_bank.csv'
    
    fieldnames = [
        "id", "question_type", "tier", "calculator", "track", "subtopic", 
        "question", "correct_answer", "wrong_answers", "marks", "difficulty", 
        "estimated_time_sec", "image_url", "image_alt", "explanation"
    ]
    
    with open(output_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        
        for q in questions:
            # Add a UUID for the id field if we need one, but the existing script just outputted without id and let supabase handle it maybe?
            # Wait, the fieldnames includes "id". Let's generate a random uuid4
            q["id"] = str(uuid.uuid4())
            writer.writerow(q)
            
    print(f"Successfully wrote identically structured rows to {output_path}")

if __name__ == "__main__":
    main()
