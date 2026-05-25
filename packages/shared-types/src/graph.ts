// ============================================================
// KENUXA Ecosystem — Graph Infrastructure Types
// All graph data owned by Core, accessible by all apps
// ============================================================

export type GraphNodeType =
  | 'person'
  | 'organization'
  | 'business'
  | 'community'
  | 'market'
  | 'signal'
  | 'trend'
  | 'dataset'
  | 'campaign'
  | 'product'
  | 'location'
  | 'technology'
  | 'event'

export type GraphRelationship =
  | 'works_at'
  | 'founded'
  | 'invested_in'
  | 'competes_with'
  | 'partners_with'
  | 'located_in'
  | 'uses_technology'
  | 'part_of'
  | 'owns'
  | 'created'
  | 'influences'
  | 'distributed_in'
  | 'connected_to'
  | 'similar_to'
  | 'successor_of'
  | 'member_of'

export interface GraphNode {
  id:              string
  organization_id: string
  type:            GraphNodeType
  label:           string
  properties:      Record<string, unknown>
  embedding?:      number[]     // vector for semantic search
  created_at:      string
  updated_at:      string
}

export interface GraphEdge {
  id:              string
  organization_id: string
  from_node_id:    string
  to_node_id:      string
  relationship:    GraphRelationship
  weight:          number    // 0-1 confidence/strength
  properties:      Record<string, unknown>
  created_at:      string
}

export interface GraphQueryParams {
  organizationId:  string
  nodeType?:       GraphNodeType
  relationship?:   GraphRelationship
  startNodeId?:    string
  depth?:          number      // max traversal depth
  limit?:          number
}

export interface GraphQueryResult {
  nodes:   GraphNode[]
  edges:   GraphEdge[]
  paths?:  Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>
}

// ─── Vector / Semantic search ────────────────────────────────

export interface VectorEmbedding {
  id:              string
  organization_id: string
  memory_id?:      string
  source_type:     string
  source_id?:      string
  content:         string
  embedding:       number[]
  metadata:        Record<string, unknown>
  created_at:      string
}

export interface SemanticSearchParams {
  organizationId: string
  query:          string
  sourceTypes?:   string[]
  limit?:         number
  threshold?:     number   // cosine similarity threshold 0-1
}

export interface SemanticSearchResult {
  id:         string
  source_type: string
  source_id?:  string
  content:    string
  similarity: number
  metadata:   Record<string, unknown>
}
