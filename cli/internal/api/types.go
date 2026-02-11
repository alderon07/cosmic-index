package api

type Meta struct {
	RequestID  string `json:"requestId"`
	APIVersion string `json:"apiVersion"`
	Timestamp  string `json:"timestamp"`
}

type Pagination struct {
	Mode       string `json:"mode"`
	Page       *int   `json:"page,omitempty"`
	Limit      *int   `json:"limit,omitempty"`
	Total      *int   `json:"total,omitempty"`
	HasMore    bool   `json:"hasMore"`
	NextCursor string `json:"nextCursor,omitempty"`
}

type ErrorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
	Meta Meta `json:"meta"`
}

type PaginatedEnvelope[T any] struct {
	Data       []T        `json:"data"`
	Pagination Pagination `json:"pagination"`
	Meta       Meta       `json:"meta"`
}

type DetailEnvelope[T any] struct {
	Data T    `json:"data"`
	Meta Meta `json:"meta"`
}

type KeyFact struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Unit  string `json:"unit,omitempty"`
}

type SourceLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type ExoplanetData struct {
	ID                string       `json:"id"`
	Type              string       `json:"type"`
	DisplayName       string       `json:"displayName"`
	DiscoveredYear    *int         `json:"discoveredYear,omitempty"`
	DiscoveryMethod   string       `json:"discoveryMethod"`
	DiscoveryFacility string       `json:"discoveryFacility,omitempty"`
	HostStar          string       `json:"hostStar"`
	DistanceParsecs   *float64     `json:"distanceParsecs,omitempty"`
	RadiusEarth       *float64     `json:"radiusEarth,omitempty"`
	MassEarth         *float64     `json:"massEarth,omitempty"`
	EquilibriumTempK  *float64     `json:"equilibriumTempK,omitempty"`
	KeyFacts          []KeyFact    `json:"keyFacts"`
	Links             []SourceLink `json:"links"`
	Summary           string       `json:"summary"`
}

type StarData struct {
	ID              string       `json:"id"`
	Type            string       `json:"type"`
	DisplayName     string       `json:"displayName"`
	PlanetCount     int          `json:"planetCount"`
	SpectralClass   string       `json:"spectralClass,omitempty"`
	SpectralType    string       `json:"spectralType,omitempty"`
	DistanceParsecs *float64     `json:"distanceParsecs,omitempty"`
	KeyFacts        []KeyFact    `json:"keyFacts"`
	Links           []SourceLink `json:"links"`
	Summary         string       `json:"summary"`
}

type SmallBodyData struct {
	ID                string       `json:"id"`
	Type              string       `json:"type"`
	DisplayName       string       `json:"displayName"`
	BodyKind          string       `json:"bodyKind"`
	OrbitClass        string       `json:"orbitClass"`
	IsNeo             bool         `json:"isNeo"`
	IsPha             bool         `json:"isPha"`
	DiameterKm        *float64     `json:"diameterKm,omitempty"`
	AbsoluteMagnitude *float64     `json:"absoluteMagnitude,omitempty"`
	KeyFacts          []KeyFact    `json:"keyFacts"`
	Links             []SourceLink `json:"links"`
	Summary           string       `json:"summary"`
}
