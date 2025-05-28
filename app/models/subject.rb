class Subject
  include Mongoid::Document
  include Mongoid::Attributes::Dynamic
  include Mongoid::Extensions::DateTime
  include Mongoid::Timestamps

  field :patient_id, type: String
  field :subject_name, type: String
  field :age, type: Integer
  field :genter, type: String
  field :dataset, type: String
  
  validates :patient_id, uniqueness: true
end
