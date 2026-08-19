# AI Implementation Rules for IDM Template Builder

This document defines the natural language rules that guide the AI in editing, formatting, designing, and implementing changes to IDM templates.

## 1. FORMAT RULES (Font Style, Styling, Text Formatting)

### 1.1 Text Capitalization Rules
- **Field Names**: Use UPPERCASE for internal field identifiers (e.g., UDDLIX, ROPANR, SSCC)
- **Labels**: Use Title Case for user-facing labels (e.g., "Shipment Reference", "Consignee Name")
- **Values**: Preserve original case unless explicitly instructed otherwise
- **Abbreviations**: Keep standard abbreviations (e.g., USA, GTIN, SSCC) in uppercase

### 1.2 Text Formatting Standards
- **Required Fields**: Mark with asterisk (*) suffix in labels when mandatory
- **Optional Fields**: No marking needed, leave as-is
- **Phone Numbers**: Format as international standard (e.g., +1-234-567-8900)
- **Email Addresses**: Validate format but preserve case of domain names
- **Dates**: ISO 8601 format (YYYY-MM-DD) for storage; display format follows locale
- **Times**: 24-hour format (HH:MM:SS) in UTC when applicable
- **Currency**: Include currency code (USD, EUR, etc.) with amount
- **Measurements**: Include unit suffix (kg, m³, ft, etc.)

### 1.3 String Padding and Length Rules
- **Field Padding**: Left-pad numeric fields with zeros when defined in schema
- **String Truncation**: If value exceeds max length, truncate at word boundary or use ellipsis (…)
- **Whitespace**: Trim leading/trailing whitespace from all values
- **Special Characters**: Escape XML special characters (<, >, &, ", ')

### 1.4 Font Style Conventions (in comments/metadata)
- **Bold**: Use for headers and critical information
- **Italic**: Use for variable placeholders and references
- **Monospace**: Use for codes, identifiers, and technical values
- **Strikethrough**: Use for deprecated fields (in comments only)

## 2. DESIGN RULES (Structure, Layout, Field Organization)

### 2.1 Field Hierarchy Rules
- **Logical Grouping**: Group related fields into sections (Sender, Recipient, Item Details, etc.)
- **Nesting**: Maximum 5 levels of nesting to maintain readability
- **Order**: Follow natural workflow order (header → details → footer)
- **Consistency**: Keep similar field types at the same hierarchy level

### 2.2 Field Organization Principles
- **Sender Information**: Name → Address → Contact (Phone/Email) → Reference
- **Recipient Information**: Name → Address → Contact → Special Instructions
- **Item Details**: Identifier → Description → Quantity → Weight → Dimensions
- **Dates**: Issue Date → Delivery Date → Requested Date (chronological order)
- **Codes**: Put standardized codes (GTIN, SSCC, SKU) near item description

### 2.3 Field Consistency Rules
- **Paired Fields**: Keep related fields together (First Name + Last Name, Address Line 1 + Line 2)
- **Unit Pairing**: Keep numeric value with unit fields together (Quantity + UOM)
- **Repeated Sections**: Use consistent naming for array elements (Item[1], Item[2], etc.)
- **Field Naming Conventions**: Follow snake_case or camelCase consistently throughout

### 2.4 Template Structure Constraints
- **Root Element**: Always M3OutDocument (never change)
- **Reserved Paths**: Do not modify system-reserved XPath elements
- **Namespace Handling**: Preserve all namespace declarations
- **CDATA Sections**: Keep CDATA sections intact for formatted content

### 2.5 Section Design Patterns
- **Required Sections**: Sender, Recipient, Items (minimum viable template)
- **Optional Sections**: Notes, Special Instructions, Custom Fields
- **Repeating Sections**: Use numbered indices for item arrays, line items
- **Metadata**: Version, Created Date, Last Modified should be in header

## 3. IMPLEMENTATION RULES (Logic, Validation, Processing)

### 3.1 Data Validation Rules
- **Type Checking**: Validate data type before assignment (string, integer, decimal, boolean)
- **Format Validation**: 
  - Email: Must match RFC 5322 pattern
  - Phone: Must be 10-15 digits, may include + and hyphens
  - Date: Must be ISO 8601 or localized format
  - Numeric: Must not contain non-numeric characters (except decimal point and sign)
- **Range Validation**: Enforce min/max values defined in schema
- **Required Fields**: Never allow null/empty for mandatory fields
- **Unique Constraints**: Validate uniqueness where schema specifies (e.g., SSCC codes)

### 3.2 Field Dependency Rules
- **Cascading Updates**: If Parent field changes, update all dependent child fields
  - Example: If Country changes, update valid postal code format
  - Example: If Carrier changes, update service level options
- **Conditional Fields**: Show/enable fields only when parent condition is met
- **Validation Dependencies**: Apply different validation rules based on parent values
- **Mutual Exclusivity**: Prevent mutually exclusive fields from both having values

### 3.3 Consistency Rules
- **Cross-field Consistency**: 
  - If "Same Address" is true, copy sender address to recipient
  - If "Bill to Recipient" is true, ensure billing address matches recipient
  - Keep name, address lines in sync across related sections
- **Format Consistency**: Apply same formatting rules to duplicate fields
- **Enumeration Consistency**: Use same enum values for repeated selection fields

### 3.4 Change Application Rules
- **Atomic Operations**: Apply all related changes together or none
- **Rollback Safety**: Track changes to enable undo/rollback
- **Validation Before Apply**: Validate all changes before applying to document
- **Patch Ordering**: Apply patches in XPath order (depth-first)
- **Conflict Resolution**: If multiple patches affect same field, merge intelligently

### 3.5 Mode-Specific Rules
**Replacing field**: replace the value and the field 

#### Ask Mode (Questions)
- **Response Type**: Provide factual information about template structure
- **Include**: Field names, types, validation rules, examples
- **Exclude**: Do not make changes; only report current state
- **Format**: Use clear, structured responses with examples

#### Agent Mode (Modification)
- **Impact**: Make direct changes to template values
- **Scope**: Update related fields for consistency
- **Validation**: Apply all validation rules before returning patches
- **Confirmation**: Suggest changes clearly so user can review

#### Plan Mode (Planning)
- **Output**: Provide step-by-step plan without executing changes
- **Detail**: Break down complex operations into logical steps
- **Dependencies**: Highlight step dependencies and order
- **Estimates**: Provide effort/complexity rating for each step

#### Debug Mode (Diagnostics)
- **Analysis**: Deep dive into issues and root causes
- **Reporting**: List all errors, warnings, and inconsistencies
- **Solutions**: Suggest fixes with explanations
- **Context**: Provide relevant XML snippets and XPath references

### 3.6 Error Handling Rules
- **Invalid XPath**: Log warning, skip patch, explain in summary
- **Type Mismatch**: Convert if possible (e.g., integer to string), otherwise reject
- **Missing Element**: Suggest creating element or skip gracefully
- **Namespace Issues**: Resolve prefixes correctly, warn if ambiguous
- **User Errors**: Provide helpful suggestions, not just rejection

### 3.7 Performance Optimization Rules
- **Batch Operations**: Combine multiple changes on same field
- **Lazy Loading**: Only parse/load fields needed for current operation
- **Cache Field Inventory**: Reuse parsed field structure across operations
- **Limit Results**: Cap output to 180 fields max for performance
- **Pagination**: For large templates, paginate results

## 4. INTERACTION RULES

### 4.1 Natural Language Processing
- **Intent Detection**: Understand user intent even with imprecise language
- **Fuzzy Matching**: Match field names even with typos (e.g., "SSCC" vs "SSC" vs "SSCC code")
- **Abbreviation Expansion**: Expand common abbreviations (e.g., "qty" → "Quantity")
- **Context Awareness**: Use template context to disambiguate references

### 4.2 Response Guidelines
- **Clarity**: Use clear, concise language in all responses
- **Structure**: Organize responses with headers, bullets, and examples
- **Explanation**: Always explain why a change was or wasn't made
- **Suggestions**: When operation isn't possible, suggest alternatives
- **Tone**: Professional, helpful, and non-judgmental

### 4.3 Error Communication
- **Be Specific**: "Field 'Consignee Name' at /M3OutDocument/Recipient/Name cannot be empty" (good) vs "Invalid input" (bad)
- **Provide Context**: Show what value caused the error and why
- **Suggest Fixes**: "Did you mean 'Consignee'?" or "Valid countries are: USA, CAN, MEX"
- **Link to Rules**: Reference relevant rule if needed

## 5. EXAMPLE RULE APPLICATIONS

### Example 1: Address Update
**User Input**: "Update the consignee address to 123 Main St, New York, NY 10001"

**AI Should**:
1. Identify all consignee-related fields (Name, Street, City, State, Postal Code, Country)
2. Apply changes in correct hierarchy order
3. Validate postal code format for New York
4. Ensure consistency across address fields
5. Return summary with all 5 patches

**Rule References**: 2.1, 2.2, 2.5, 3.2, 3.3, 3.4

### Example 2: Format Question
**User Input**: "How should I format the phone number?"

**AI Should**:
1. Identify phone number field in current template
2. Report formatting rule: International format (+1-234-567-8900)
3. Show current value and properly formatted example
4. Not make any changes
5. Explain validation rules

**Rule References**: 1.2, 4.2, Ask Mode

### Example 3: Template Validation
**User Input**: "Check if my template is valid"

**AI Should**:
1. Analyze all fields against validation rules
2. Report missing required fields
3. Flag formatting issues
4. Check consistency rules
5. Suggest fixes for each issue

**Rule References**: 3.1, 3.2, 3.3, Debug Mode

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-18  
**Review Cycle**: Quarterly or as needed
