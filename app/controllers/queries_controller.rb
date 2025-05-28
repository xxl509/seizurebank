class QueriesController < ApplicationController
  require 'csv'
  require 'open3'
  require 'json'
  require 'histogram/array'

  before_action :set_query_params
  include QueriesHelper
  include ApplicationHelper

  def index
    # seizures = Seizure.where(is_seizure: "seizure").pluck(:duration).map(&:to_f)
    # non = Seizure.where(is_seizure: "non-seizure").pluck(:duration).map(&:to_f)
    # p seizures.sum
    # p non.sum
    # dasd
    basic_query
    create_folders_for_user
  end

  def show
    @patient_id = params[:patient_id]
    @seizure_id = params[:seizure_id]

    if @patient_id.nil? || @seizure_id.nil?
      return
    end

    @channel_labels = params[:channel_label]
    if @channel_labels.nil? || @channel_labels.length == 0
      @channel_labels = SeizureSignal.where(patient_id: @patient_id, seizure_id:@seizure_id).pluck(:channel_label).uniq
    else
      @channel_labels = @channel_labels.split(",").map(&:strip).uniq
    end   
    # csvname = "#{Rails.root}/public/svg_data/csv_data.csv"
    # @input_file_path = "../svg_data/csv_data.csv"
    @data, @fs,@start_rec_time,@units = get_csv_for_signals(@patient_id,@seizure_id,@channel_labels, "1Hz", "70Hz")
    
    @channels = ["All"] + SeizureSignal.where(patient_id: @patient_id, seizure_id:@seizure_id).pluck(:channel_label).uniq
    @is_seizure = Seizure.where(id: BSON::ObjectId(@seizure_id)).first.is_seizure
  end

  def visual_tool
    @montages_type << "Original Channels"
  end

  def data_dashboard
    @sub_num = Subject.all.size
    @seizure_num = Seizure.where(is_seizure: "seizure").size
    @nonseizure_num = Seizure.where(is_seizure: "non-seizure").size
    @dataset_num = Subject.all.pluck(:dataset).uniq.size

    @ages = Subject.all.pluck(:age)
    @ages = @ages.select{|i| i > 0}
    genders_pre = Subject.all.pluck(:gender)
    subs = Subject.all.pluck(:patient_id)
    @sub_seizures = []
    subs.each do |sub|
      @sub_seizures << Seizure.where(patient_id: sub, is_seizure: "seizure").size
    end
    @dur_seizures = Seizure.where(is_seizure: "seizure").pluck(:duration)
    genders_pre = genders_pre.inject(Hash.new(0)) { |total, e| total[e] += 1 ;total}
    @genders = []
    genders_pre.each do |key, value|
      tmp = {}
      tmp["name"] = key
      tmp["value"] = value
      @genders << tmp
    end
    @genders = @genders.to_json
  end

  def subject_query_refresh
    start_runing_time = Time.now
    filters_params = params[:filters_params]
    string_input = params[:string_input]

    if filters_params.nil? && (string_input.nil? || string_input.length < 1)
      basic_query
      return
    end

    if string_input.nil? || string_input.length < 1
      subjects_id,seizures_id,seizure_signal_chan = advance_query(filters_params,nil)
    else
      str = string_input.to_s.split(/\s/).collect{|l| l.to_s.gsub(/[^\w\d%]/, '')}.collect{|l| "#{l}"}.join("%")
      patient_ids = Subject.where(patient_id: /#{str}/i).order_by(:id => 'asc').pluck(:patient_id).map(&:to_s)
      subjects_id,seizures_id,seizure_signal_chan = advance_query(filters_params,patient_ids)
    end

    if subjects_id.nil? || seizures_id.nil? || seizure_signal_chan.nil?
      basic_query
      return
    end
    

    
    @queries_json = []

    query = Seizure.where(patient_id: {'$in': subjects_id}, id: {'$in': seizures_id}).order_by(:id => 'asc')
    subjects = query.pluck(:patient_id)
    sub_fs = query.pluck(:fs)
    sub_seizures = query.pluck(:id).map(&:to_s)
    subjects_map = Hash.new
    subjects.each_with_index do |sub,i_sub|
      tmp = subjects_map[sub]
      if tmp.nil?
        tmp = Hash.new{|hsh,key| hsh[key] = [] }
      end
      tmp["seizure_id"].push sub_seizures[i_sub]
      tmp["fs"].push sub_fs[i_sub]
      subjects_map[sub] = tmp
    end

    query = Subject.where(patient_id: {'$in': subjects_map.keys}).order_by(:id => 'asc')
    subjects = query.pluck(:patient_id)
    sub_name = query.pluck(:subject_name)
    sub_age = query.pluck(:age)
    sub_gender = query.pluck(:gender)
    sub_dataset = query.pluck(:dataset)
    subjects.each_with_index do |sub,i_sub|
      tmp = subjects_map[sub]
      tmp["name"].push sub_name[i_sub]
      tmp["age"].push sub_age[i_sub]
      tmp["gender"].push sub_gender[i_sub]
      tmp["dataset"].push sub_dataset[i_sub]
      subjects_map[sub] = tmp
    end

    @fragments_sum = 0

    subjects_map.keys.each_with_index do |key, i_key|
      fs = subjects_map[key]['fs'].uniq
      q_json = {
        "id" => i_key+1,
        "name" => subjects_map[key]['name'],
        "patient_id" => key,
        "age" => subjects_map[key]['age'],
        "gender" => subjects_map[key]['gender'],
        "dataset" => subjects_map[key]['dataset'],
        "channel_num" => seizure_signal_chan[key].length,
        "fragments" => subjects_map[key]['seizure_id'].length,
        "fs" => fs,
        "channel_labels" => seizure_signal_chan[key]
      } 
      @fragments_sum = @fragments_sum + subjects_map[key]['seizure_id'].length
      @queries_json << q_json
    end

    # subjects_id.each_with_index do |sub,i_s|
    #   q = Subject.where(patient_id: sub).first
    #   fs = Seizure.where(id: {'$in': seizures_id}, patient_id: sub).pluck(:fs)
    #   seizure_num = fs.size
    #   fs = fs.uniq
    #   channel_num = seizure_signal_chan[i_s].length
    #   # channel_num = SeizureSignal.where(patient_id: sub, id: {'$in': seizure_signal_id},  seizure_id: {'$in': seizures_id}).pluck(:channel_label).uniq.size
    #   q_json = {
    #     "id" => i_s+1,
    #     "name" => q.subject_name,
    #     "patient_id" => sub,
    #     "age" => q.age,
    #     "gender" => q.gender,
    #     "channel_num" => channel_num,
    #     "fragments" => seizure_num,
    #     "fs" => fs
    #   } 
    #   @queries_json << q_json
    # end
    @query_num = @queries_json.size
    @queries_json = @queries_json.to_json
    end_runing_time = Time.now
    p end_runing_time - start_runing_time
  end

  def each_sub_query_refresh
    patient_id = params[:patient_id]
    filters_params = params[:filters_params]
    patient_id_query = [patient_id]
    subjects_id,seizures_id,seizure_signal_id = advance_query(filters_params,patient_id_query)
    @queries_json = []
    count = 1

    ###### display by each channel ###### ###### ###### ###### 
    # subjects_id.each_with_index do |sub,i_s|
    #   q = Subject.where(patient_id: sub).first
    #   seizure_query = Seizure.where(id: {'$in': seizures_id}, patient_id:  sub)
    #   seizure_query.each do |sei|
    #     signal_type = sei.is_seizure
    #     seizure_type = sei.seizure_type
    #     duration = sei.duration
    #     fs = sei.fs
    #     sei_id = sei.id.to_s
    #     channels = seizure_signal_id[sub]
    #     # channels = SeizureSignal.where(patient_id: sub, id: {'$in': seizure_signal_id},  seizure_id: sei_id).pluck(:channel_label)
    #     channels.each do |chan|
    #       q_json = {
    #         "id" => count,
    #         "patient_id" => sub,
    #         "signal_type" => signal_type,
    #         "seizure_type" => seizure_type,
    #         "channel" => chan,
    #         "duration" => duration,
    #         "fs" => fs,
    #         "seizure_id" => sei_id
    #       } 
    #       @queries_json << q_json
    #       count = count +1
    #     end
    #   end
    # end
    ################################################

    ###### display by each seizure fragments ###### ###### ###### 
    subjects_id.each_with_index do |sub,i_s|
      q = Subject.where(patient_id: sub).first
      seizure_query = Seizure.where(id: {'$in': seizures_id}, patient_id:  sub).order_by(:start => 'asc')
      seizure_query.each do |sei|
        signal_type = sei.is_seizure
        seizure_type = sei.seizure_type
        duration = sei.duration
        fs = sei.fs
        sei_id = sei.id.to_s
        channels = seizure_signal_id[sub]
        # channels = SeizureSignal.where(patient_id: sub, id: {'$in': seizure_signal_id},  seizure_id: sei_id).pluck(:channel_label)
        q_json = {
          "id" => count,
          "patient_id" => sub,
          "signal_type" => signal_type,
          "seizure_type" => seizure_type,
          "channel" => channels.length,
          "duration" => duration,
          "fs" => fs,
          "seizure_id" => sei_id,
          "channel_labels" => channels
        } 
        @queries_json << q_json
        count = count +1
      end
    end
    ###############################################################
    @query_num = @queries_json.size
    @queries_json = @queries_json.to_json
  end

  def singal_show_refresh
    channel = params[:channel]
    patient_id = params[:patient_id]
    seizure_id = params[:seizure_id]
    filter_low = params[:filter_low]
    filter_high = params[:filter_high]

    if patient_id.nil? || seizure_id.nil? || channel.nil?
      return
    end

    if filter_low.nil?
      filter_low = ""
    end

    if filter_high.nil?
      filter_high = ""
    end

    if channel.include? "All"
      channel = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id).pluck(:channel_label).uniq
    end

    @data, @fs,@start_rec_time,@units = get_csv_for_signals(patient_id,seizure_id,channel,filter_low,filter_high)
    
  end

  def spectrogram_show_refresh
    @channel = params[:channel]
    patient_id = params[:patient_id]
    seizure_id = params[:seizure_id]
    @spect_val = params[:spect_val]
    filter_low = params[:filter_low]
    filter_high = params[:filter_high]
    if patient_id.nil? || seizure_id.nil? || @channel.nil? || @spect_val.nil?
      return
    end

    if filter_low.nil?
      filter_low = ""
    end

    if filter_high.nil?
      filter_high = ""
    end

    fs = Seizure.where(id: BSON::ObjectId(seizure_id)).first.fs
    data = []

    l = 0
    h = fs

    if filter_low != "" && filter_high !=""
      l = filter_low.gsub("Hz","").to_f
      h = filter_high.gsub("Hz","").to_f
      # temp_all = bandPassFilter(temp_all, fs, h, l)
    elsif filter_low != ""
      l = filter_low.gsub("Hz","").to_f
      # temp_all = lowPassFilter(temp_all, fs, l)
    elsif filter_high != ""
      h = filter_high.gsub("Hz","").to_f
      # temp_all = highPassFilter(temp_all, fs, h)
    end

    if(@channel.include?("—"))
      chan1 = @channel.split("—")[0]
      chan2 = @channel.split("—")[1]
      sig1 = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: chan1).first.fragments.split(",").map(&:to_f)
      sig2 = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: chan2).first.fragments.split(",").map(&:to_f)
      data = sig1.zip(sig2).map { |x, y| x-y }
    else
      data = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: @channel).first.fragments.split(",").map(&:to_f)
    end
    
    if l != 0 && h != fs
      data = bandPassFilter(data, fs, l, h)
    end

    if @spect_val == "Time-Frequency"
      # txtname = "#{Rails.root}/public/spectrogram_data/signal.txt"
      txtname = "#{Rails.root}/public/spectrogram_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "/signal.txt"
      FileUtils.rm_rf(txtname, secure: true)
      File.open(txtname, "w+") do |f|
        f.puts(data)
      end
      stdin, stdout, stderr = Open3.popen3("python3 #{Rails.root}/lib/python/test.py #{txtname.to_json} #{fs.to_json}")
      results = []
      stdout.each do |ele|
        results = JSON.parse(ele)
      end
      @f_plot = results[0].reverse;
      @t_plot = results[1];
      @spec = results[2].reverse;
    elsif @spect_val == "Frequency"
      index = ((0..data.size).to_a).map{|i| (i.to_f/fs).to_f}
      x, y = [index,data].collect {|v| v.kind_of?(Array) ? GSL::Vector.alloc(v) : v}
      fft = y.fft 
      n = y.size
      @f_plot = []
      @y_plot = []
      (0...n).each {|i| 
        freq = i*(0.5/(n*(x[1]-x[0])))
        @f_plot.push(freq)
        @y_plot.push(fft[i].abs)
      }
    end
  end

  def download_data
    partient_ids = params[:partient_ids]
    channel_labels = params[:channel_labels]
    signal_type = params[:signal_type]
    if partient_ids.nil? || channel_labels.nil?
      return
    end
    if signal_type.nil?
      signal_type = ["seizure","non-seizure"]
    end
    filepath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "/download/"
    FileUtils.rm_rf(filepath + ".", secure: true)
    txtpath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "_download_progress.txt"

    ######### for progress bar ##############
    progress_count = 1;
    progress_total = 0;
    partient_ids.each_with_index do |pid, pid_i|
      seizures = Seizure.where(patient_id: pid, is_seizure: {'$in': signal_type});
      progress_total = progress_total + seizures.size
    end
    if progress_total < 1
      return
    end
    ######### explor data ####################
    partient_ids.each_with_index do |pid, pid_i|
      channel = channel_labels[pid_i]
      seizures = Seizure.where(patient_id: pid, is_seizure: {'$in': signal_type}).order_by(:id => 'asc');
      if seizures.size < 1
        next
      end
      folder = filepath + pid + "/"
      Dir.mkdir(folder) unless File.exists?(folder)
      seizures.each_with_index do |sei,sei_i|
        sigs = []
        sei_id = sei.id
        type = sei.is_seizure.strip
        dur = sei.duration
        fs = sei.fs
        chan = channel
        filename = folder + pid + "#" + type + "#" + sei_i.to_s + ".csv"
        if chan == "All"
          chan = sei.channels        
        end
        chan = chan.split(",")
        chan = chan.map(&:strip).uniq
        sigs = SeizureSignal.where(patient_id: pid,seizure_id: sei_id,channel_label: {'$in': chan})
        header = ["event","duration","units","channel","fs","signal"]
        CSV.open(filename, 'w') do |csv_object|
          csv_object << header
          sigs.each do |sig|
            row = []
            row << type.to_s
            row << dur
            row << "s"
            row << sig.channel_label.to_s
            row << fs
            row << sig.fragments.to_s
            csv_object << row
          end
        end
        progress = (((progress_count/progress_total*1000).to_i)/10).to_f
        if(progress > 99.9)
          progress = 99.9
        end
        File.open(txtpath, "w+") {|f| f.write(progress.to_s)}
        progress_count = progress_count + 1;
      end
    end
    @filepath = filepath
    compress(filepath)
    File.open(txtpath, "w+") {|f| f.write("")}
  end

  def download
    filepath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "/download"
    send_file(
      filepath+"/download.zip",
      filename: "seizurebank_download.zip",
      type: "application/zip",
      x_sendfile: true
    )
    # filepath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "/download/"
    # FileUtils.rm_rf(filepath + ".", secure: true)
  end

  def subject_id_search
    string_input = params[:string_input]
    if string_input.nil? || string_input.length < 1
      return
    end
    str = string_input.to_s.split(/\s/).collect{|l| l.to_s.gsub(/[^\w\d%]/, '')}.collect{|l| "#{l}"}.join("%")

    query = Seizure.where(patient_id: /#{str}/i).order_by(:id => 'asc')
    subjects = query.pluck(:patient_id)
    sub_fs = query.pluck(:fs)
    sub_seizures = query.pluck(:id).map(&:to_s)
    sub_channels = query.pluck(:channels)
    subjects_map = Hash.new
    subjects.each_with_index do |sub,i_sub|
      tmp = subjects_map[sub]
      if tmp.nil?
        tmp = Hash.new{|hsh,key| hsh[key] = [] }
      end
      tmp["seizure_id"].push sub_seizures[i_sub]
      tmp["fs"].push sub_fs[i_sub]
      tmp["channels"].push sub_channels[i_sub].split(",").map(&:to_s)
      subjects_map[sub] = tmp
    end

    subjects_map.keys.each do|key|
      sub_channles = subjects_map[key]["channels"]
      intersec = []
      sub_channles.each_with_index do |sch,i_sch|
        if intersec.size == 0
          intersec = sch
        else
          intersec = intersec | sch
        end
      end
      subjects_map[key]["channels"] = intersec
    end

    query = Subject.where(patient_id: {'$in': subjects_map.keys}).order_by(:id => 'asc')
    subjects = query.pluck(:patient_id)
    sub_name = query.pluck(:subject_name)
    sub_age = query.pluck(:age)
    sub_gender = query.pluck(:gender)
    sub_dataset = query.pluck(:dataset)
    subjects.each_with_index do |sub,i_sub|
      tmp = subjects_map[sub]
      tmp["name"].push sub_name[i_sub]
      tmp["age"].push sub_age[i_sub]
      tmp["gender"].push sub_gender[i_sub]
      tmp["dataset"].push sub_dataset[i_sub]
      subjects_map[sub] = tmp
    end

    @fragments_sum = 0

    @queries_json = []
    subjects_map.keys.each_with_index do |key, i_key|
      fs = subjects_map[key]['fs'].uniq
      q_json = {
        "id" => i_key+1,
        "name" => subjects_map[key]['name'],
        "patient_id" => key,
        "age" => subjects_map[key]['age'],
        "gender" => subjects_map[key]['gender'],
        "dataset" => subjects_map[key]['dataset'],
        "channel_num" => subjects_map[key]['channels'].length,
        "fragments" => subjects_map[key]['seizure_id'].length,
        "fs" => fs,
        "channel_labels" => subjects_map[key]['channels']
      } 
      @fragments_sum = @fragments_sum + subjects_map[key]['seizure_id'].length
      @queries_json << q_json
    end
    @query_num = @queries_json.size
    @queries_json = @queries_json.to_json
  end

  private
    # Never trust parameters from the scary internet, only allow the white list through.
    ##### version 1 ########
    # def set_query_params
    #   # @ages = ['0-10 years','11-20 years','21-30 years','31-40 years','41-50 years','51-60 years','61-70 years', '70-80 years','80-120 years']
    #   # @durations = ["0-30s","31-60s","61-120s","121-180s","180-300s"]
    #   queries = Subject.all
    #   ages = queries.all.pluck(:age).map(&:to_i);
    #   @age_min_global = ages.min
    #   @age_max_global = ages.max
    #   @age_min_show = 0
    #   @age_max_show = @age_max_global
    #   @genders_global = queries.all.pluck(:gender).uniq
    #   @datasets = queries.all.pluck(:dataset).uniq
    #   durations = Seizure.all.pluck(:duration)
    #   @duration_min_global = 0
    #   @duration_max_global = durations.max
    #   # @signal_type_global = Seizure.all.pluck(:signal_type).map { |e| e=e.strip }.uniq
    #   @signal_type_global = Seizure.all.pluck(:is_seizure).uniq
    #   @eegs_global = ['No EEG','Fp1','Fp2','F3','F4','C3','C4','P3','P4','O1','O2','F7','F8','T7','T8','P7','P8','Fz','Cz','Pz','A1','A2','FT7','TP7','C5','FT9','FT10','F9','T9','F10','T10','FT8','TP8','C6','F5','F6']
    #   @ekgs_global = ['No EKG','EKG1','EKG2','EKG3','EKG4']
    #   @others_global = ['No Others','FC5','FC6','CP5','CP6','AF8','SP1','SP2','LNEC','RNEC','LOC','ROC','AF7','SAO2','HR','Pleth','BP','DC10','THOR','ABDM']
    #   @colors_global = { 
    #     "age" => "#0984e3", 
    #     "gender" => "#7f8c8d",
    #     "dataset" => "#d35400",
    #     "duration" => "#B53471", 
    #     "signal_type" =>"#9b59b6",
    #     "eeg" =>"#2ed573",
    #     "ekg" =>"#57606f",
    #     "other" =>"#ffa502",
    #   }.to_json

    #   @freqList = ["0.1Hz","0.2Hz","0.5Hz","1Hz","2Hz","3Hz","4Hz","5Hz","10Hz","15Hz","20Hz","25Hz","30Hz","35Hz","40Hz","50Hz","60Hz","70Hz","80Hz","90Hz","100Hz"]

    #   @montages_type = ["Run 1","Run 2","Run 3","Run 4","Run 5","Run 6","Run 7"]
    #   @runs = []
    #   @runs << ["Fp1—F7","F7—T7","T7—P7","P7—O1","Fp2—F8","F8—T8","T8—P8","P8—O2","Fp1—F3","F3—C3","C3—P3","P3—O1","Fp2—F4","F4—C4","C4—P4","P4—O2","Fz—Cz","Cz—Pz"].map(&:strip).map(&:downcase )
    #   @runs << ["Fp1—A1","F7—A1","T7—A1","P7—A1","Fp2—A2","F8—A2","T8—A2","P8—A2","F3—A1","C3—A1","P3—A1","O1—A1","F4—A2","C4—A2","P4—A2","O2—A2","Fz—A2","Cz—A2","Pz—A2"].map(&:strip).map(&:downcase)
    #   @runs << ["Fp1—F7","FP2—F8","F7—T7","F8—T8","T7—P7","T8—P8","P7—O1","P8—O2","FP1—F3","FP2—F4","F3—C3","F4—C4","C3—P3","C4—P4","P3—O1","P4—O2","Fz—Cz","Cz—Pz"].map(&:strip).map(&:downcase )
    #   @runs << ["Fp1—Cz","Fp2—Cz","F7—Cz","F8—Cz","T7—Cz","T8—Cz","P7—Cz","P8—Cz","F3—Cz","F4—Cz","C3—Cz","C4—Cz","P3—Cz","P4—Cz","O1—Cz","O2—Cz","FT9—Cz","FT10—Cz","A1—Cz","A2—Cz"].map(&:strip).map(&:downcase )   
    #   @runs << ["F7—F3","F3—Fz","Fz—F4","F4—F8","A1—T7","T7—C3","C3—Cz","Cz—C4","C4—T8","T8—A2","P7—P3","P3—Pz","Pz—P4","P4—P8","Fp1—A1","Fp2—A2","O1—A1","O2—A2"].map(&:strip).map(&:downcase )
    #   @runs << ["Fp1—F7","F7—FT9","FT9—T7","T7—P7","P7—O1","Fp2—F8","F8—FT10","FT10—T8","T8—P8","P8—O2","FT9—FT10","A1—A2","Fp1—F3","F3—C3","C3—P3","Fp2—F4","F4—C4","C4—P4"].map(&:strip).map(&:downcase )
    #   @runs << ["EKG1—EKG2","EKG1—EKG3","EKG1—EKG4","LSO—Cz","LIO—Cz","RSO—Cz","RIO—Cz","OCL—Cz","OCR—Cz","LNEC—AAV","RNEC—AAV","THOR","ABD","O2 Saturation","HR","FZ—Cz"].map(&:strip).map(&:downcase)
    # end

    def set_query_params
      # @ages = ['0-10 years','11-20 years','21-30 years','31-40 years','41-50 years','51-60 years','61-70 years', '70-80 years','80-120 years']
      # @durations = ["0-30s","31-60s","61-120s","121-180s","180-300s"]
      # queries = Subject.all
      # ages = queries.all.pluck(:age).map(&:to_i);
      @age_min_global = 0
      @age_max_global = 100
      @age_min_show = 0
      @age_max_show = @age_max_global
      @genders_global = ['female','male']
      @datasets = []
      durations = [30,60,120,180]
      @duration_min_global = 0
      @duration_max_global = durations.max
      # @signal_type_global = Seizure.all.pluck(:signal_type).map { |e| e=e.strip }.uniq
      # @signal_type_global = Seizure.all.pluck(:is_seizure).uniq
      @signal_type_global = ['seizures']
      @eegs_global = ['No EEG','Fp1','Fp2','F3','F4','C3','C4','P3','P4','O1','O2','F7','F8','T7','T8','P7','P8','Fz','Cz','Pz','A1','A2','FT7','TP7','C5','FT9','FT10','F9','T9','F10','T10','FT8','TP8','C6','F5','F6']
      @ekgs_global = ['No EKG','EKG1','EKG2','EKG3','EKG4']
      @others_global = ['No Others','FC5','FC6','CP5','CP6','AF8','SP1','SP2','LNEC','RNEC','LOC','ROC','AF7','SAO2','HR','Pleth','BP','DC10','THOR','ABDM']
      @colors_global = { 
        "age" => "#0984e3", 
        "gender" => "#7f8c8d",
        "dataset" => "#d35400",
        "duration" => "#B53471", 
        "signal_type" =>"#9b59b6",
        "eeg" =>"#2ed573",
        "ekg" =>"#57606f",
        "other" =>"#ffa502",
      }.to_json

      @freqList = ["0.1Hz","0.2Hz","0.5Hz","1Hz","2Hz","3Hz","4Hz","5Hz","10Hz","15Hz","20Hz","25Hz","30Hz","35Hz","40Hz","50Hz","60Hz","70Hz","80Hz","90Hz","100Hz"]

      @montages_type = ["Run 1","Run 2","Run 3","Run 4","Run 5","Run 6","Run 7"]
      @runs = []
      @runs << ["Fp1—F7","F7—T7","T7—P7","P7—O1","Fp2—F8","F8—T8","T8—P8","P8—O2","Fp1—F3","F3—C3","C3—P3","P3—O1","Fp2—F4","F4—C4","C4—P4","P4—O2","Fz—Cz","Cz—Pz"].map(&:strip).map(&:downcase )
      @runs << ["Fp1—A1","F7—A1","T7—A1","P7—A1","Fp2—A2","F8—A2","T8—A2","P8—A2","F3—A1","C3—A1","P3—A1","O1—A1","F4—A2","C4—A2","P4—A2","O2—A2","Fz—A2","Cz—A2","Pz—A2"].map(&:strip).map(&:downcase)
      @runs << ["Fp1—F7","FP2—F8","F7—T7","F8—T8","T7—P7","T8—P8","P7—O1","P8—O2","FP1—F3","FP2—F4","F3—C3","F4—C4","C3—P3","C4—P4","P3—O1","P4—O2","Fz—Cz","Cz—Pz"].map(&:strip).map(&:downcase )
      @runs << ["Fp1—Cz","Fp2—Cz","F7—Cz","F8—Cz","T7—Cz","T8—Cz","P7—Cz","P8—Cz","F3—Cz","F4—Cz","C3—Cz","C4—Cz","P3—Cz","P4—Cz","O1—Cz","O2—Cz","FT9—Cz","FT10—Cz","A1—Cz","A2—Cz"].map(&:strip).map(&:downcase )   
      @runs << ["F7—F3","F3—Fz","Fz—F4","F4—F8","A1—T7","T7—C3","C3—Cz","Cz—C4","C4—T8","T8—A2","P7—P3","P3—Pz","Pz—P4","P4—P8","Fp1—A1","Fp2—A2","O1—A1","O2—A2"].map(&:strip).map(&:downcase )
      @runs << ["Fp1—F7","F7—FT9","FT9—T7","T7—P7","P7—O1","Fp2—F8","F8—FT10","FT10—T8","T8—P8","P8—O2","FT9—FT10","A1—A2","Fp1—F3","F3—C3","C3—P3","Fp2—F4","F4—C4","C4—P4"].map(&:strip).map(&:downcase )
      # @runs << ["EKG1—EKG2","EKG1—EKG3","EKG1—EKG4","LSO—Cz","LIO—Cz","RSO—Cz","RIO—Cz","OCL—Cz","OCR—Cz","LNEC—AAV","RNEC—AAV","THOR","ABD","O2 Saturation","HR","FZ—Cz"].map(&:strip).map(&:downcase)
      @runs << ['fp1—f7', 'f7—t7', 't7—p7', 'fp2—f8', 'f8—t8', 't8—p8', 'fz—cz', 'cz—pz','fp1—f7', 'f7—t3', 't3—t5', 'fp2—f8', 'f8—t4', 't4—t6', 'fz—cz', 'cz—pz'].map(&:strip).map(&:downcase).uniq
    end

    def query_params
      params.fetch(:query, {})
    end
end
