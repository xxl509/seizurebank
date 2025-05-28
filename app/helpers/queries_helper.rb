module QueriesHelper

  def bandPassFilter(data,fs,lowCutoff, highCutoff)
    index = ((0..data.size).to_a).map{|i| (i.to_f/fs).to_f}
    x, y = [index,data].collect {|v| v.kind_of?(Array) ? GSL::Vector.alloc(v) : v}
    fft = y.fft 
    n = y.size
    (0...n).each {|i| 
      freq = i*(0.5/(n*(x[1]-x[0])))
      fft[i] = 0 if (freq < lowCutoff or freq > highCutoff)
    }
    data_new = fft.inverse.to_a
    return data_new
  end

	def basic_query
		queries = Subject.all
    @queries_json = []
    @query_num = @queries_json.size
    @fragments_sum = 0
    @queries_json = @queries_json.to_json
	end

  def create_folders_for_user
    user_email = current_user.email
    folder_str = "#{Rails.root}/public/spectrogram_data/"+user_email.gsub(/[^0-9a-z ]/i,"_")
    Dir.mkdir(folder_str) unless File.exists?(folder_str) 

    folder_str = "#{Rails.root}/app/assets/download_data/"
    Dir.mkdir(folder_str) unless File.exists?(folder_str)

    folder_str = "#{Rails.root}/app/assets/download_data/"+user_email.gsub(/[^0-9a-z ]/i,"_")
    Dir.mkdir(folder_str) unless File.exists?(folder_str)

    folder_str = "#{Rails.root}/app/assets/download_data/"+user_email.gsub(/[^0-9a-z ]/i,"_") + "/download"
    Dir.mkdir(folder_str) unless File.exists?(folder_str) 

    filepath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "/download/"
    FileUtils.rm_rf(filepath + ".", secure: true)

    @progress_file = "/assets/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "_download_progress.txt"

    filepath = "#{Rails.root}/app/assets/download_data/" + current_user.email.gsub(/[^0-9a-z ]/i,"_") + "_download_progress.txt"
    FileUtils.rm_rf(filepath, secure: true)
    FileUtils.touch(filepath)
  end

	def advance_query(filters_params,patient_id_query)
		if filters_params.nil?
			if patient_id_query.nil?
      	basic_query
      	return
      else
      	subjects_id = Subject.where(patient_id: {'$in': patient_id_query}).pluck(:patient_id)
	      seizures_id = Seizure.where(patient_id: {'$in': subjects_id}).pluck(:id).map(&:to_s)
	      channels = @eegs_global + @ekgs_global + @others_global
     		channels = channels.map(&:downcase)

        seizure_signal_chan = {}
        subjects_id.each do |sid|
          seizure_signal_id = SeizureSignal.where(patient_id: sid,seizure_id: {'$in': seizures_id},channel_label: {'$in': channels}).pluck(:channel_label).uniq
          seizure_signal_chan[sid] = seizure_signal_id
        end
	      return subjects_id,seizures_id,seizure_signal_chan
      end 
    end

		ages = filters_params[:age].nil? ? [@age_min_global.to_s + "," + @age_max_global.to_s] : filters_params[:age]
    ages = merge_overlapping_ranges(ages.map { |e| e = e.split(",").map(&:to_i) })

    datasets = filters_params[:dataset].nil? ? @datasets : filters_params[:dataset]

    genders = filters_params[:gender].nil? ? @genders_global : filters_params[:gender]

    signal_types = filters_params[:signal_type].nil? ? @signal_type_global : filters_params[:signal_type]

    durations = filters_params[:duration].nil? ? [@duration_min_global.to_s + "," + @duration_max_global.to_s] : filters_params[:duration]
    durations = merge_overlapping_ranges(durations.map { |e| e = e.split(",").map(&:to_f)})

    eegs = filters_params[:eeg].nil? ? [] : filters_params[:eeg]
    ekgs = filters_params[:ekg].nil? ? [] : filters_params[:ekg]
    others = filters_params[:other].nil? ? [] : filters_params[:other]
    channels = eegs+ekgs+others
    channels = channels.map(&:downcase)
    subjects_id_sub = []


    ages.each do |age|
      ids = Subject.where(gender: {'$in': genders}, dataset: {'$in': datasets}, age: { :$gte => age.min, :$lte => age.max}).pluck(:patient_id)
      tmp = (subjects_id_sub + ids) - (subjects_id_sub & ids)
      subjects_id_sub = subjects_id_sub | tmp
    end

    if !patient_id_query.nil?
      subjects_id_sub = subjects_id_sub & patient_id_query
    end

    if subjects_id_sub.length == 0
      return
    end


 	  subjects_id_sz = []
    seizure_id_sz = []
    durations.each do |dur|
      sei_query = Seizure.where(patient_id: {'$in': subjects_id_sub},is_seizure: {'$in': signal_types}, duration: { :$gte => dur.min, :$lte => dur.max}).order_by(:id => 'asc')
      ids = sei_query.pluck(:patient_id)
      tmp = (subjects_id_sz + ids) - (subjects_id_sz & ids)
      subjects_id_sz = subjects_id_sz | tmp
      ids = sei_query.pluck(:id).map(&:to_s)
      tmp = (seizure_id_sz + ids) - (seizure_id_sz & ids)
      seizure_id_sz = seizure_id_sz | tmp
    end
    subjects_id = subjects_id_sub & subjects_id_sz

    channel_all = @eegs_global + @ekgs_global + @others_global
    channel_request = true
    if channels.size == 0
      channel_request = false
      channels = channel_all.map(&:downcase)
    else
      if channels.include?("No EEG".downcase)
        channel_all = channel_all - @eegs_global
        channels.delete("No EEG".downcase)
      end
      if channels.include?("No EKG".downcase)
        channel_all = channel_all - @ekgs_global
        channels.delete("No EKG".downcase)
      end
      if channels.include?("No Others".downcase)
        channel_all = channel_all - @others_global
        channels.delete("No Others".downcase)
      end
      if channels.size == 0
        channel_request = false
        channels = channel_all.map(&:downcase)
      else
        channels = channels.map(&:downcase)
      end
    end

    subjects_id_chan = []
    seizure_id_chan = []
    seizure_signal_chan = Hash.new

    query = Seizure.where(patient_id: {'$in': subjects_id}, id: {'$in': seizure_id_sz}).order_by(:id => 'asc')
    subjects = query.pluck(:patient_id)
    sub_channles = query.pluck(:channels)
    sub_channles.map!{ |n| n = n.split(",").map(&:strip)}
    sub_seizures = query.pluck(:id).map(&:to_s)
    subjects_map = Hash.new
    subjects.each_with_index do |sub,i_sub|
      tmp = subjects_map[sub]
      if tmp.nil?
        tmp = Hash.new{|hsh,key| hsh[key] = [] }
      end
      tmp["seizure_id"].push sub_seizures[i_sub]
      tmp["channel_name"].push sub_channles[i_sub]
      subjects_map[sub] = tmp
    end
    subjects_map.keys.each do|key|
      sub_channles = subjects_map[key]["channel_name"]
      sub_seizures = subjects_map[key]["seizure_id"]
      intersec = []
      sub_channles.each_with_index do |sch,i_sch|
        insc = sch & channels
        if channel_request && insc.size != channels.size
          next
        end

        if insc.size <= 0
          next
        end

        seizure_id_chan << sub_seizures[i_sch]
        if intersec.size == 0
          intersec = insc
        else
          intersec = intersec | insc
        end
      end
      if intersec.size <= 0
        next
      end
      subjects_id_chan << key
      seizure_signal_chan[key] = intersec   
    end

    # subjects_id.each do |sub|
    #   query = Seizure.where(patient_id: sub, id: {'$in': seizure_id_sz}).order_by(:id => 'asc')
    #   sub_channles = query.pluck(:channels)
    #   sub_channles.map!{ |n| n = n.split(",").map(&:strip)}
    #   sub_seizures = query.pluck(:id).map(&:to_s)
    #   intersec = []
    #   sub_channles.each_with_index do |sch,i_sch|
    #     insc = sch & channels
    #     if insc.size <= 0
    #       next
    #     end
    #     seizure_id_chan << sub_seizures[i_sch]
    #     if intersec.size == 0
    #       intersec = sch
    #     else
    #       intersec = intersec & sch
    #     end
    #   end
    #   if intersec.size <= 0
    #     next
    #   end
    #   subjects_id_chan << sub
    #   seizure_signal_chan << intersec     
    # end

    # seizure_id_sz.each do |sei|
    #   # seizure_signal_query = SeizureSignal.where(seizure_id: sei, channel_label: {'$in': channels})
    #   seizure_signal_query = SeizureSignal.where(seizure_id: sei, channel_label: {'$in': channels})
    #   if seizure_signal_query.size == 0
    #     next;
    #   end
    #   subjects_id_chan << seizure_signal_query.first.patient_id
    #   seizure_id_chan << sei
    #   seizure_signal_id.concat seizure_signal_query.pluck(:id)
    # end

    # subjects_id_chan = seizure_signal_query.pluck(:patient_id)
    # seizure_id_chan = seizure_signal_query.pluck(:seizure_id)
    # seizure_signal_id = seizure_signal_query.pluck(:id)

    # subjects_id = subjects_id & subjects_id_chan
    # seizures_id = seizure_id_sz & seizure_id_chan

    return subjects_id_chan,seizure_id_chan,seizure_signal_chan
	end

	def get_csv_for_signals(patient_id,seizure_id,channel_labels,low_filter,high_filter)
		# FileUtils.rm_rf(csvname, secure: true)
		seizures = Seizure.where(id: BSON::ObjectId(seizure_id)).first
    fs = seizures.fs
    units = []
    start_rec_time = "00:00:00"
    columns = ["index"]
    start_index = 1
    signals = []
    l = 0
    h = fs
    if low_filter != "" && high_filter !=""
      l = low_filter.gsub("Hz","").to_f
      h = high_filter.gsub("Hz","").to_f
      # temp_all = bandPassFilter(temp_all, fs, h, l)
    elsif low_filter != ""
      l = low_filter.gsub("Hz","").to_f
      # temp_all = lowPassFilter(temp_all, fs, l)
    elsif high_filter != ""
      h = high_filter.gsub("Hz","").to_f
      # temp_all = highPassFilter(temp_all, fs, h)
    end

    channel_labels.each do |chan|
      if(chan.include?("—"))
        chan1 = chan.split("—")[0]
        chan2 = chan.split("—")[1]
        query1 = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: chan1)
        query2 = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: chan2)
        if query1.first.nil? || query2.first.nil?
          next
        end
        columns << chan.strip
        units.push("mv")
        sig1 = query1.first.fragments.split(",").map(&:to_f)
        sig2 = query2.first.fragments.split(",").map(&:to_f)
        sig = sig1.zip(sig2).map { |x, y| x-y }
      else
        query = SeizureSignal.where(patient_id: patient_id, seizure_id:seizure_id, channel_label: chan)
        if query.first.nil?
          next
        end
        columns << chan.strip
        units.push("mv")
        sig = query.first.fragments.split(",").map(&:to_f)
        # signals.push(sig)
      end
      sig = bandPassFilter(sig, fs, l, h)
      signals.push(sig)
    end
    # CSV.open(csvname, 'w') do |csv_object|
    #   csv_object << columns
    # 	scale_len_max = signals[0].size
    #   iStart = (start_index-1)*1*fs.to_i
    #   for i in 1..scale_len_max
    #     row = [];
    #     row << "%07d" % (iStart+i)
    #     signals.each do |sig|
	   #      row << sig[i-1]
	   #    end
    #     csv_object << row
	   #  end
    # end

    scale_len_max = signals[0].size
    data = []
    for i in 1..scale_len_max
      row = {}
      columns.each_with_index do|c, i_c|
        if i_c == 0
          row[c] = "%07d" % i
        else
          row[c] = signals[i_c-1][i-1]
        end
      end
      data << row
    end

    return data,fs,start_rec_time,units
	end


	def ranges_overlap?(a, b)
	  a.include?(b.first) || b.include?(a.first)
	end

	def merge_ranges(a, b)
	  [a.first, b.first].min..[a.last, b.last].max
	end

	def merge_overlapping_ranges(overlapping_ranges)
	  overlapping_ranges.sort_by {|r| r.first }.inject([]) do |ranges, range|
	    if !ranges.empty? && ranges_overlap?(ranges.last, range)
	      ranges[0...-1] + [merge_ranges(ranges.last, range)]
	    else
	      ranges + [range]
	    end
	  end
	end

end
