Rails.application.routes.draw do
  devise_for :users
  resources :subjects
  root "queries#index"
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html

  resources :queries
  resources :queries do
    collection do
      post "subject_query_refresh"
      post "each_sub_query_refresh"
      post 'singal_show_refresh'
      post "spectrogram_show_refresh"
      post "download_data"
      post "subject_id_search"
    end
  end
  get 'download' => 'queries#download'
  get 'queries/show'
  get 'visual_tool' => 'queries#visual_tool'
  get 'data_dashboard' => 'queries#data_dashboard'
end
