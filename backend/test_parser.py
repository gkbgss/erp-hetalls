import csv
from io import StringIO

contents = """Employee Name (June 2026),SALARY,Com. Name,DEPARTMENT
Meethalal,15500,HETALLS,FIELD"""

csv_reader = csv.DictReader(StringIO(contents))
for row in csv_reader:
    print("Raw row:", row)
    
    # Normalize headers
    norm_row = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k}
    print("Norm row:", norm_row)
    
    name_key = next((k for k in norm_row.keys() if 'name' in k and 'com' not in k and 'company' not in k), None)
    salary_key = next((k for k in norm_row.keys() if 'salary' in k or 'pay' in k or 'amount' in k), None)
    dept_key = next((k for k in norm_row.keys() if 'dept' in k or 'department' in k), None)
    email_key = next((k for k in norm_row.keys() if 'email' in k or 'mail' in k), None)
    role_key = next((k for k in norm_row.keys() if 'role' in k or 'designation' in k), None)
    company_key = next((k for k in norm_row.keys() if 'com' in k or 'company' in k), None)
    
    print("Keys found:")
    print("Name:", name_key)
    print("Salary:", salary_key)
    print("Dept:", dept_key)
    print("Email:", email_key)
    print("Role:", role_key)
    print("Company:", company_key)
    
    name = norm_row.get(name_key, '') if name_key else ''
    print("Final name:", name)
