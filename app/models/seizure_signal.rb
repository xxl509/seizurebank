class SeizureSignal
  include Mongoid::Document
  include Mongoid::Document
  include Mongoid::Attributes::Dynamic
  include Mongoid::Extensions::DateTime
  include Mongoid::Timestamps

  field :id, type:String
  field :patient_id, type:String
  field :seizure_id, type: String
  field :channel_label, type: String
  field :fragments, type: String

  validates :id, uniqueness: true
end
