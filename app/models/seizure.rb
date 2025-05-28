class Seizure
  include Mongoid::Document
  include Mongoid::Document
  include Mongoid::Attributes::Dynamic
  include Mongoid::Extensions::DateTime
  include Mongoid::Timestamps

  field :id, type:String
  field :patient_id, type:String
  field :is_seizure, type: String
  field :seizure_type, type: String
  field :start, type: Float
  field :duration, type: Float
  field :fs, type: Float
  field :channels, type: String
  field :pre_seziure_id, type:String
  field :after_seziure_id, type:String

  validates :id, uniqueness: true
end
