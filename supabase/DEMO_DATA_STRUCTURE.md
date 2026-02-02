# Demo Data Structure - Symbio Research CRO

## Contract Hierarchy Model

The demo data implements a **parent-child contract hierarchy** to reflect real-world CRO project structures.

### Contract Categories

#### 1. Main Study Contracts (Parents)
- **Type**: `msa` (Master Service Agreement)
- **Purpose**: Primary sponsor agreements for clinical trials
- **Has**: Milestones, Change Orders, Pass-Through Costs
- **Children**: Subcontractors, potentially NDAs

**Main Contracts in Demo:**
- `SYM-2024-001` - Phase III Psoriasis Study (€2.85M)
  - 3 subcontractors
  - 9 milestones
  - 3 change orders
  - 5 pass-through cost categories

- `SYM-2024-002` - Phase II Atopic Dermatitis (€1.65M)
  - 8 milestones
  - 1 change order (reduction)
  - 3 pass-through cost categories

- `SYM-2025-001` - Phase I/II Wound Healing (€1.125M)
  - 1 subcontractor
  - 8 milestones
  - 1 change order
  - 4 pass-through cost categories

- `SYM-2023-008` - Phase II Acne Study (€890K) - COMPLETED
- `SYM-2024-005` - Medical Device AI Melanoma Detection (€425K)

#### 2. Subcontractor Contracts (Children)
- **Type**: `service_agreement`
- **Fields**: `parent_contract_id`, `relationship_type = 'sub_contract'`
- **Purpose**: Vendors providing specialized services to main studies
- **Has**: Contract value, but typically NO milestones/COs/PTCs of their own
- **Linked via**:
  - `vendor_revenue_share` table (for revenue/cost allocation)
  - Referenced in parent's `passthrough_costs.vendor_contract_id`

**Subcontractors in Demo:**

*For SYM-2024-001 (Psoriasis):*
- `SYM-SUB-2024-101` - EuroLab Diagnostics (Central Lab) - €285K
- `SYM-SUB-2024-102` - DermImaging Solutions (Imaging Core Lab) - €135K
- `SYM-SUB-2024-103` - ClinData Systems (eCRF Development) - €42K [COMPLETED]

*For SYM-2025-001 (Wound Healing):*
- `SYM-SUB-2025-201` - WoundTech Imaging (3D Wound Imaging) - €95K

#### 3. Legal/Pre-Project Contracts
- **Type**: `nda`
- **Purpose**: Confidentiality agreements, often before project starts
- **Has**: Parties, expiration date, typically NO value
- **May have**: `parent_contract_id` if linked to specific project

**NDAs in Demo:**
- `SYM-2024-NDA-003` - GlobalDerm Pharmaceuticals (Potential Phase III vitiligo study)

## Linking Models

### Model A: Direct Pass-Through (Most Common)
Subcontractor costs are budgeted and tracked in parent's `passthrough_costs` table.

```
Main Contract (SYM-2024-001)
  └─ passthrough_costs
      ├─ investigator_fees: €675K budgeted, €285K spent
      ├─ lab_costs: €285K budgeted, €142K spent
      │   └─ vendor_contract_id → SYM-SUB-2024-101 (Central Lab)
      ├─ imaging: €135K budgeted, €68K spent
      │   └─ vendor_contract_id → SYM-SUB-2024-102 (Imaging Lab)
      ├─ travel: €185K budgeted, €92K spent
      └─ regulatory: €45K budgeted, €45K spent (PAID)
```

### Model B: Milestone-Based Revenue Share
Subcontractor receives percentage of specific milestone payments.

```
Main Contract Milestone Payment (€100K)
  └─ vendor_revenue_share (25%)
      └─ Subcontractor receives €25K
```

**Example in Demo:**
- `vendor_revenue_share` links vendors to parent contracts
- `share_type`: 'percentage', 'fixed', 'per_unit', 'tiered'
- `applies_to`: Which milestones/deliverables (e.g., "Development milestones")

## UI Implications

### Main Contract View (MSA)
Should display:
- ✅ Current Value (with change order adjustments)
- ✅ Milestones count & value
- ✅ Change Orders count & impact
- ✅ PTC Budget & utilization
- ✅ **Linked Subcontractors** (new section)
  - Show child contracts with status
  - Revenue share model
  - Spent vs. budgeted

### Subcontractor View
Should display:
- ✅ Current Value
- ✅ **Parent Project** (link to main contract)
- ✅ Revenue Share Model
  - Type (fixed, percentage, etc.)
  - Total allocated
  - Total paid to date
- ❌ NO Milestones (they support parent's milestones)
- ❌ NO Change Orders (changes happen on parent)
- ❌ NO PTC (they ARE the pass-through)

### NDA View
Should display:
- ✅ Parties (Vendor/Client)
- ✅ Signature Date
- ✅ Expiration Date
- ✅ Status
- ❌ NO Value (or €0)
- ❌ NO Milestones
- ❌ NO PTC

## Project/Hierarchy View (Recommended)

```
📋 SYM-2024-001 - Phase III Psoriasis Study
   €2.85M → €3.26M (after COs) | Active | 35 sites

   📊 Milestones: 4/9 complete | €780K paid
   📝 Change Orders: 3 (+€342K net)
   💰 Pass-Through: €1.325M budgeted | €572K spent (43%)

   🔗 Subcontractors (3):
   ├─ 🧪 SYM-SUB-2024-101 | EuroLab Diagnostics | €285K | Active
   │   └─ Linked to: Lab Costs PTC | €142K paid of €285K
   ├─ 📸 SYM-SUB-2024-102 | DermImaging Solutions | €135K | Active
   │   └─ Linked to: Imaging PTC | €68K paid of €135K
   └─ 💾 SYM-SUB-2024-103 | ClinData Systems | €42K | Completed
       └─ Linked to: Study Startup | €42K paid (100%)
```

## Queries to Support Hierarchy

### Get all children of a contract:
```sql
SELECT * FROM contracts
WHERE parent_contract_id = 'parent-uuid'
ORDER BY relationship_type, contract_number;
```

### Get parent with all children:
```sql
SELECT
  parent.*,
  json_agg(children.*) as subcontracts
FROM contracts parent
LEFT JOIN contracts children ON children.parent_contract_id = parent.id
WHERE parent.contract_number = 'SYM-2024-001'
GROUP BY parent.id;
```

### Get contract with hierarchy context:
```sql
SELECT
  c.*,
  parent.title as parent_title,
  parent.contract_number as parent_number,
  COUNT(children.id) as subcontractor_count
FROM contracts c
LEFT JOIN contracts parent ON c.parent_contract_id = parent.id
LEFT JOIN contracts children ON children.parent_contract_id = c.id
WHERE c.contract_number = 'SYM-2024-001'
GROUP BY c.id, parent.id;
```

## Next Steps for Implementation

1. **Update Contract List View**
   - Add filter: "Show main contracts only" (where parent_contract_id IS NULL)
   - Add column: "Subs" (count of children)
   - Add badge/icon for contract category

2. **Create Project Detail View**
   - Tabbed interface:
     - Overview (with sub-contracts section)
     - Milestones (parent only)
     - Change Orders (parent only)
     - Pass-Through Costs (parent only)
     - Subcontractors (parent only)

3. **Update Subcontractor Detail View**
   - Add "Parent Project" breadcrumb/link
   - Show revenue share model
   - Remove milestone/CO/PTC tabs

4. **Add Hierarchy Navigation**
   - Breadcrumbs: Parent > Child
   - "View Parent Project" button on sub contracts
   - "View Subcontractors" section on parent contracts

5. **Filter/Search Enhancements**
   - Filter by contract category (Main, Sub, NDA)
   - Search includes parent project name
   - Group results by parent project
